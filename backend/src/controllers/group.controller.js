// Group controller
import { getReceiverSocketId } from "../lib/socket.js";
import Group from "../models/group.model.js";
import { io } from "../lib/socket.js";
import GroupMessage from "../models/groupMessages.model.js";

// create a group
export const createGroup = async (req, res) => {
    try {
        const { groupName, members } = req.body;
        console.log(req.body);
        if (!groupName || !members || members.length < 2) {
            return res.status(400).json({ message: 'Group name and at least two members are required' });
        }

        const newGroup = new Group({
            name: groupName,
            members: members,
            createdBy: req.user._id
        });

        await newGroup.save();

        // Emit event to all group members
        members.forEach((memberId) => {
            const memberSocketId = getReceiverSocketId(memberId);
            if (memberSocketId) {
                console.log(`User ${memberId} joins room ${newGroup._id}`);
                io.sockets.sockets.get(memberSocketId)?.join(newGroup._id.toString());
                io.to(memberSocketId).emit("groupCreated", newGroup);
            }
        });
        res.status(201).json(newGroup);
    } catch (error) {
        console.error("Error creating group:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};




// get the all groups
export const getGroup = async (req, res) => {
    try {
        const groups = await Group.find().populate('createdBy', 'fullName')
            .populate('members', 'fullName');

        const usersWithLastMessage = await Promise.all(
            groups.map(async (group) => {
                const lastMessage = await GroupMessage.findOne({
                    groupId: group._id
                }).sort({ createdAt: -1 })
                    .select("text createdAt")
                    .lean()
                return {
                    ...group.toObject(),
                    lastMessage: lastMessage ? lastMessage.text : null,
                    lastMessageTime: lastMessage ? lastMessage.createdAt : null
                }
            })
        )




        res.status(200).json(groups);
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}