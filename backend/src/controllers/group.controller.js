// Group controller
import { getReceiverSocketId } from "../lib/socket.js";
import Group from "../models/group.model.js";
import { io } from "../lib/socket.js";

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
        // console.log("New Group Created:", newGroup);

        // Emit event to all group members
        members.forEach((memberId) => {
            const memberSocketId = getReceiverSocketId(memberId);
            if (memberSocketId) {
                console.log(`User ${memberId} joins room ${newGroup._id}`);

                // ✅ Add user to the Socket.io room
                io.sockets.sockets.get(memberSocketId)?.join(newGroup._id.toString());
                // ✅ Send real-time event that a new group was created
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
        const group = await Group.find().populate('createdBy', 'fullName')
            .populate('members', 'fullName');;
        res.status(200).json(group);
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}