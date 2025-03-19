import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import path from "path"

// get all user without the login user
export const getUserForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;

        // find All user without loggedIn user
        const filterUser = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
        res.status(200).json(filterUser)
    } catch (error) {
        console.log("Error from getUser controller ", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

// get selected users messages
export const getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const myId = req.user._id;


        // find messages to filtering
        const message = await Message.find({
            $or: [
                { senderId: myId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myId }
            ]
        }).populate("senderId", "fullName").populate({
            path: "replyMsg",
            select: ["text", "image", "file", "createdAt"],
            populate: {
                path: "senderId",
                select: "fullName" // Populate sender fullName inside replyMsg
            }
        })

        res.status(200).json(message);
    } catch (error) {
        console.log("Error in getMessages controller ", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

// sendMessage 
export const sendMessage = async (req, res) => {
    try {
        const { text, image, file, replyMsg } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;
        // console.log(replyMsg);

        // upload image to cloudinary
        let imageUrl, fileUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        if (file) {
            if (file && file.size > 100 * 1024 * 1024) {
                return res.status(413).json({ message: "File size exceeds 100MB limit." });
            }
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

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
            file: file ? { url: fileUrl, name: file.name } : null,
            replyMsg: replyMsg ? replyMsg : null,
        });

        await newMessage.save();
        const populatedMessage = await Message.findById(newMessage._id)
            .populate({
                path: "replyMsg",
                select: ["text", "image", "file", "createdAt"],
                populate: {
                    path: "senderId",
                    select: "fullName",
                },
            })
            .populate("senderId", "fullName");

        // Real-time functionality using Socket.io
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", populatedMessage);
        }

        res.status(200).json(populatedMessage);
    } catch (error) {
        console.log("Error in sendMessage controller : ", error.message);
        res.status(500).json({ message: "internal server message" })
    }
}   