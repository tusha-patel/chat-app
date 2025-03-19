import cloudinary from "../lib/cloudinary.js";
import { io } from "../lib/socket.js";
import Group from "../models/group.model.js";
import GroupMessage from "../models/groupMessages.model.js";
import path from "path"

// send the meesage with group
export const sendGroupMessage = async (req, res) => {
    try {
        const { groupId, text, image, file, replyMsg } = req.body;
        // console.log(groupId, text);
        console.log(req.body);

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
            // console.log(uploadResponse);
            fileUrl = uploadResponse.secure_url;
        }

        const newMessage = new GroupMessage({
            groupId,
            senderId: userId,
            message: text,
            image: imageUrl,
            file: file ? { url: fileUrl, name: file.name } : null,
            replyMsg: replyMsg ? replyMsg : null,
        });

        await newMessage.save();

        const populatedMessage = await GroupMessage.findById(newMessage._id)
            .populate({
                path: "replyMsg",
                select: ["message", "image", "file", "createdAt"],
                populate: {
                    path: "senderId",
                    select: "fullName",
                },
            })
            .populate("senderId", "fullName");

        // Real-time functionality using Socket.io
        io.to(groupId).emit("newMessage", populatedMessage);
        // io.to(groupId).emit('groupMessage', { groupId, message: text, sender: userId });
        console.log(newMessage);

        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error('Error sending group message:', error);
        res.status(500).json({ message: 'Internal server error' });
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

        const messages = await GroupMessage.find({ groupId }).populate('senderId', 'fullName').populate({
            path: "replyMsg",
            select: ["message", "image", "file", "createdAt"],
            populate: {
                path: "senderId",
                select: "fullName"
            }
        });;

        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching group messages:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
