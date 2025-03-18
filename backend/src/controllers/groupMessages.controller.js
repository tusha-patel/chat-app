import cloudinary from "../lib/cloudinary.js";
import { io } from "../lib/socket.js";
import Group from "../models/group.model.js";
import GroupMessage from "../models/groupMessages.model.js";
import path from "path"

// send the meesage with group
export const sendGroupMessage = async (req, res) => {
    try {
        const { groupId, text, image, file } = req.body;
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
            sender: userId,
            message: text,
            image: imageUrl,
            file: file ? { url: fileUrl, name: file.name } : null,
        });

        await newMessage.save();
        io.to(groupId).emit("newMessage", newMessage);
        // io.to(groupId).emit('groupMessage', { groupId, message: text, sender: userId });
        console.log(newMessage);

        res.status(201).json(newMessage);
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

        const messages = await GroupMessage.find({ groupId }).populate('sender', 'username');

        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching group messages:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
