import cloudinary from "../lib/cloudinary.js";
import { io } from "../lib/socket.js";
import Group from "../models/group.model.js";
import GroupMessage from "../models/groupMessages.model.js";
import path from "path"

// send the meesage with group
export const sendGroupMessage = async (req, res) => {
    try {
        const { groupId, text, image, file, replyOff } = req.body;

        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }
        let imageUrl, fileUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        // Upload file
        if (file) {
            const fileExt = path.extname(file.name); // Extract extension
            const uploadResponse = await cloudinary.uploader.upload(file.data, {
                resource_type: "raw",
                folder: "chat_app",
                use_filename: true,
                unique_filename: false,
                format: fileExt.substring(1) // Ensure correct extension
            });

            fileUrl = uploadResponse.secure_url;
        }

        const newMessage = new GroupMessage({
            groupId,
            senderId: userId,
            message: text,
            image: imageUrl,
            file: file ? { url: fileUrl, name: file.name } : null,
            replyOff: replyOff ? replyOff : null,
        });

        await newMessage.save();

        const populatedMessage = await GroupMessage.findById(newMessage._id)
            .populate({
                path: "replyOff",
                select: ["message", "image", "file", "createdAt"],
                populate: {
                    path: "senderId",
                    select: "fullName",
                },
            })
            .populate("senderId", "fullName");

        // Real-time functionality using Socket.io
        io.to(groupId).emit("newMessage", populatedMessage);
        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error('Error sending group message:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};


// get the groupMessage
export const getGroupMessages = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if the user is a member of the group
        if (!group.members.includes(userId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const messages = await GroupMessage.find({ groupId, isDeleted: false }).populate('senderId', 'fullName').populate({
            path: "replyOff",
            select: ["message", "image", "file", "createdAt"],
            populate: {
                path: "senderId",
                select: "fullName"
            }
        });

        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching group messages:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};



// deleteGroupMessage
export const deleteGroupMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const groupMessage = await GroupMessage.findByIdAndUpdate(messageId, {
            isDeleted: true
        }, { new: true });

        if (!groupMessage) {
            return res.status(400).json({
                message: "This message not removed ! plz try again"
            });
        }
        // Emit the event to notify users about the deleted message
        io.emit("groupMessageDeleted", { messageId });
        res.status(200).json({ groupMessage });
    } catch (error) {
        console.error('Error delete group messages:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}


export const updateGroupMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { text } = req.body;

        if (!messageId || !text) {
            return res.status(400).json({ message: "Message ID and text are required." });
        }

        // Update the message in the database
        const updatedGroupMessage = await GroupMessage.findByIdAndUpdate(
            messageId,
            { message: text },
            { new: true }
        ).populate('senderId', 'fullName').populate({
            path: "replyOff",
            select: ["message", "image", "file", "createdAt"],
            populate: {
                path: "senderId",
                select: "fullName"
            }
        });;

        if (!updatedGroupMessage) {
            return res.status(404).json({ message: "Message not found." });
        }

        // Emit the updated message to all group members
        // console.log("Emitting editGroupMessages event for group:", updatedGroupMessage.groupId);
        io.emit("editGroupMessages", updatedGroupMessage);

        res.status(200).json(updatedGroupMessage);
    } catch (error) {
        console.error('Error updating group message:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};