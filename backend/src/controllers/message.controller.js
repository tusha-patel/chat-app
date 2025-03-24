import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import path from "path"

// get all user without the login user
export const getUserForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;

        // Find all users except the logged-in user
         const users = await User.find({ _id: { $ne: loggedInUserId } })
            .select("-password") // Exclude the password field
            .populate({
                path: "contacts.userId", // Path to populate
                select: "fullName email profilePic", // Fields to include from the referenced User collection
            })
            .lean();

        res.status(200).json(users);
    } catch (error) {
        console.log("Error in getUsers controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

// get selected users messages
export const getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const myId = req.user._id;

        console.log(userToChatId);

        // find messages to filtering
        const message = await Message.find({
            $or: [
                { senderId: myId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myId },
            ],
            isDeleted: false
        }).populate("senderId", "fullName").populate({
            path: "replyOff",
            select: ["text", "image", "file", "createdAt"],
            populate: {
                path: "senderId",
                select: "fullName" // Populate sender fullName inside replyOff
            }
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
        const { text, image, file, replyOff } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;
        console.log(receiverId, senderId);


        // Upload image to Cloudinary
        let imageUrl, fileUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        // Upload file to Cloudinary
        if (file) {
            if (file.size > 100 * 1024 * 1024) {
                return res.status(413).json({ message: "File size exceeds 100MB limit." });
            }
            const fileExt = path.extname(file.name); // Extract extension
            const uploadResponse = await cloudinary.uploader.upload(file.data, {
                resource_type: "raw",
                folder: "chat_app",
                use_filename: true,
                unique_filename: false,
                format: fileExt.substring(1), // Ensure correct extension
            });
            fileUrl = uploadResponse.secure_url;
        }

        // Create the new message
        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
            file: file ? { url: fileUrl, name: file.name } : null,
            replyOff: replyOff ? replyOff : null,
        });

        // Save the new message
        await newMessage.save();

        // Populate the sender and receiver details
        const populatedMessage = await Message.findById(newMessage._id)
            .populate({
                path: "replyOff",
                select: ["text", "image", "file", "createdAt"],
                populate: {
                    path: "senderId",
                    select: "fullName",
                },
            })
            .populate("senderId", "fullName")
            .populate("receiverId", "fullName");

        // Update the last message for the sender and receiver
        await User.findByIdAndUpdate(senderId, {
            lastMessage: text || (file ? file.name : null) || (image ? "photo" : null),
            lastMessageTime: newMessage.createdAt,
        });

        await User.findByIdAndUpdate(receiverId, {
            lastMessage: text || (file ? file.name : null) || (image ? "photo" : null),
            lastMessageTime: newMessage.createdAt,
        });

        // Emit the new message to both sender and receiver
        const senderSocketId = getReceiverSocketId(senderId);
        const receiverSocketId = getReceiverSocketId(receiverId);

        if (senderSocketId) {
            io.to(senderSocketId).emit("newMessage", populatedMessage);
        }
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", populatedMessage);
        }

        res.status(200).json(populatedMessage);
    } catch (error) {
        console.log("Error in sendMessage controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};


// deleteMessage
export const deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const message = await Message.findByIdAndUpdate(id, { isDeleted: true }, { new: true });

        if (!message) {
            return res.status(400).json({ message: "This message was not removed! Please try again." });
        }

        // Find sender and receiver IDs
        const { senderId, receiverId } = message;

        // Find the last message for both sender and receiver
        const lastMessageForSender = await Message.findOne({
            $or: [
                { senderId: senderId, receiverId: receiverId },
                { senderId: receiverId, receiverId: senderId },
            ],
            isDeleted: false
        })
            .sort({ createdAt: -1 })
            .select("text createdAt file image")
            .lean();

        // Update the last message for the sender and receiver in the database
        await User.findByIdAndUpdate(senderId, {
            lastMessage: lastMessageForSender ? lastMessageForSender.text || lastMessageForSender?.file?.name || lastMessageForSender?.image : null,
            lastMessageTime: lastMessageForSender ? lastMessageForSender.createdAt : null,
        });

        await User.findByIdAndUpdate(receiverId, {
            lastMessage: lastMessageForSender ? lastMessageForSender.text || lastMessageForSender?.file?.name || lastMessageForSender?.image : null,
            lastMessageTime: lastMessageForSender ? lastMessageForSender.createdAt : null,
        });

        // Emit the deletion event to both sender and receiver
        io.to(getReceiverSocketId(senderId)).emit("messageDeleted", {
            messageId: id,
            lastMessage: lastMessageForSender ? lastMessageForSender.text || lastMessageForSender?.file?.name || lastMessageForSender?.image : null,
            lastMessageTime: lastMessageForSender ? lastMessageForSender.createdAt : null,
            chatUserId: receiverId
        });

        io.to(getReceiverSocketId(receiverId)).emit("messageDeleted", {
            messageId: id,
            lastMessage: lastMessageForSender ? lastMessageForSender.text || lastMessageForSender?.file?.name || lastMessageForSender?.image : null,
            lastMessageTime: lastMessageForSender ? lastMessageForSender.createdAt : null,
            chatUserId: senderId
        });

        res.status(200).json({ message: "Message deleted successfully" });
    } catch (error) {
        console.log("Error in deleteMessage controller: ", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};


// updateMessage
export const updateMessage = async (req, res) => {
    try {
        const { text } = req.body;
        const { messageId } = req.params;

        if (!messageId) {
            return res.status(400).json({
                message: "Message not found"
            })
        }

        const updateMessage = await Message.findByIdAndUpdate(messageId, {
            text: text
        }, { new: true }).populate({
            path: "replyOff",
            select: ["text", "image", "file", "createdAt"],
            populate: {
                path: "senderId",
                select: "fullName",
            },
        }).populate("senderId", "fullName");

        if (!updateMessage) {
            return res.status(400).json({
                message: "message not updated plz try again !"
            });
        }
        io.emit("messageEdited", updateMessage);
        res.status(200).json(updateMessage);
    } catch (error) {
        console.log("Error in deleteMessage controller : ", error.message);
        res.status(500).json({ message: "internal server message" });
    }
}