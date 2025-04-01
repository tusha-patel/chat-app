// Group controller
import { getReceiverSocketId } from "../lib/socket.js";
import Group from "../models/group.model.js";
import { io } from "../lib/socket.js";
import GroupMessage from "../models/groupMessages.model.js";

// create a group
export const createGroup = async (req, res) => {
    try {
        const { groupName, members } = req.body;
        // console.log(req.body);
        console.log(groupName);

        if (!groupName || !members || members.length < 2) {
            return res.status(400).json({ message: 'Group name and at least two members are required' });
        }

        const findGroupName = await Group.findOne({ name: groupName });
        console.log(findGroupName);

        if (findGroupName) {
            return res.status(400).json({ message: "This group alredy exist , plz try another group name" })
        }

        console.log(members);
        const allMembers = [...new Set([...members, req.user._id.toString()])];

        const newGroup = new Group({
            name: groupName,
            members: allMembers,
            createdBy: req.user._id
        });

        await newGroup.save();

        // Populate the group data before emitting
        const populatedGroup = await Group.findById(newGroup._id)
            .populate('members', 'fullName profilePic')
            .populate('createdBy', 'fullName profilePic');

        // Emit to all members including creator
        allMembers.forEach((memberId) => {
            const memberSocketId = getReceiverSocketId(memberId);
            if (memberSocketId) {
                io.to(memberSocketId).emit("groupCreated", populatedGroup);
                io.sockets.sockets.get(memberSocketId)?.join(newGroup._id.toString());
            }
        });

        res.status(201).json(populatedGroup);
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