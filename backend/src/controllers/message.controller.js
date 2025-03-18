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
        });

        res.status(200).json(message);
    } catch (error) {
        console.log("Error in getMessages controller ", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

// sendMessage 
export const sendMessage = async (req, res) => {
    try {
        const { text, image, file } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;
        // console.log(req.body);

        // upload image to cloudinary
        let imageUrl, fileUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

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

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
            file: file ? { url: fileUrl, name: file.name } : null,
        });

        await newMessage.save();
        // console.log(newMessage);

        // realtime functionality goes here => socket.io
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }


        res.status(200).json(newMessage);
    } catch (error) {
        console.log("Error in sendMessage controller : ", error.message);
        res.status(500).json({ message: "internal server message" })
    }
}   