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
            .select("-password") 
            .populate({
                path: "contacts.userId", 
                select: "fullName email profilePic",
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

        // Check if users are contacts
        const sender = await User.findById(senderId);
        const receiver = await User.findById(receiverId);

        if (!sender || !receiver) {
            return res.status(404).json({ message: "User not found" });
        }

        // Initialize contacts if not exists
        if (!sender.contacts) sender.contacts = [];
        if (!receiver.contacts) receiver.contacts = [];

        const isContact = sender.contacts.some(
            contact => contact.userId.equals(receiverId) && contact.status === "accepted"
        );

        // Handle file uploads
        let imageUrl, fileUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        if (file) {
            if (file.size > 100 * 1024 * 1024) {
                return res.status(413).json({ message: "File size exceeds 100MB limit." });
            }
            const fileExt = path.extname(file.name);
            const uploadResponse = await cloudinary.uploader.upload(file.data, {
                resource_type: "raw",
                folder: "chat_app",
                use_filename: true,
                unique_filename: false,
                format: fileExt.substring(1),
            });
            fileUrl = uploadResponse.secure_url;
        }

        // Create message (whether contact request or regular message)
        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
            file: file ? { url: fileUrl, name: file.name } : null,
            replyOff: replyOff ? replyOff : null,
            isContactRequest: !isContact, // Mark as contact request if not contacts
            requestStatus: !isContact ? "pending" : undefined
        });

        await newMessage.save();

        // If this is a contact request, update contacts
        if (!isContact) {
            // Add to contacts if not already exists
            if (!sender.contacts.some(c => c.userId.equals(receiverId))) {
                sender.contacts.push({ userId: receiverId, status: "pending" });
            }

            if (!receiver.contacts.some(c => c.userId.equals(senderId))) {
                receiver.contacts.push({
                    userId: senderId,
                    status: "pending",
                    initialMessage: text
                });
            }

            await sender.save();
            await receiver.save();
        }

        // Populate message details
        const populatedMessage = await Message.findById(newMessage._id)
            .populate({
                path: "replyOff",
                select: ["text", "image", "file", "createdAt"],
                populate: {
                    path: "senderId",
                    select: "fullName",
                },
            })
            .populate("senderId", "fullName profilePic lastMessage")
            .populate("receiverId", "fullName profilePic lastMessage");

        // Update last message for both users
        const lastMessageContent = text || (file ? file.name : null) || (image ? "photo" : null);
        await User.findByIdAndUpdate(senderId, {
            lastMessage: lastMessageContent,
            lastMessageTime: newMessage.createdAt,
        });

        await User.findByIdAndUpdate(receiverId, {
            lastMessage: lastMessageContent,
            lastMessageTime: newMessage.createdAt,
        });

        // Emit socket events
        const senderSocketId = getReceiverSocketId(senderId);
        const receiverSocketId = getReceiverSocketId(receiverId);

        if (senderSocketId) {
            io.to(senderSocketId).emit("newMessage", populatedMessage);
            if (!isContact) {
                io.to(senderSocketId).emit("newContactRequest", {
                    senderId: receiver,  // Receiver appears in sender's sidebar
                    status: "pending",
                });
            }
        }

        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", populatedMessage);
            if (!isContact) {
                io.to(receiverSocketId).emit("newContactRequest", {
                    senderId: sender, // Sender appears in receiver's sidebar
                    status: "pending",
                });
            }
        }

        res.status(200).json({
            ...populatedMessage.toObject(),
            isContactRequest: !isContact
        });

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


export const handleContactRequest = async (req, res) => {
    try {
        const { messageId, action } = req.body;
        const receiverId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message || !message.isContactRequest) {
            return res.status(404).json({ message: "Request not found" });
        }

        const senderId = message.senderId;
        const sender = await User.findById(senderId);
        const receiver = await User.findById(receiverId);
        console.log(receiverId, senderId);

        if (action === "accept") {
            // Update contact status
            const senderContact = sender.contacts.find(c => c.userId.equals(receiverId));
            const receiverContact = receiver.contacts.find(c => c.userId.equals(senderId));

            if (senderContact) senderContact.status = "accepted";
            if (receiverContact) receiverContact.status = "accepted";

            // Update message status
            message.requestStatus = "accepted";

            await sender.save();
            await receiver.save();
            await message.save();

            // Emit acceptance notification
            const senderSocketId = getReceiverSocketId(senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit("contactRequestAccepted", {
                    receiverId,
                    messageId
                });
            }

            return res.status(200).json({ message: "Contact request accepted" });

        } else if (action === "declined") {

            // console.log(action);

            // Remove contacts
            sender.contacts = sender.contacts.filter(c => !c.userId.equals(receiverId));
            receiver.contacts = receiver.contacts.filter(c => !c.userId.equals(senderId));

            // Update message status
            message.isDeleted = true;
            message.requestStatus = "declined";
            console.log(message);

            await sender.save();
            await receiver.save();
            await message.save();

            const senderSocketId = getReceiverSocketId(senderId);
            const receiverSocketId = getReceiverSocketId(receiverId);
            if (senderSocketId) {
                io.to(senderSocketId).emit("contactRequestDeclined",
                    { senderId: receiver._id, }
                );
            }
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("contactRequestDeclined",
                    { senderId: sender._id, }
                );
            }

            return res.status(200).json({ message: "Contact request declined" });
        }

    } catch (error) {
        console.log("Error in handleContactRequest:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const checkPendingRequest = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user._id;

        // First check if users are already contacts
        const currentUser = await User.findById(currentUserId);
        const isAlreadyContact = currentUser.contacts.some(
            contact => contact.userId.equals(userId) && contact.status === "accepted"
        );

        if (isAlreadyContact) {
            return res.status(200).json(null);
        }

        // Check for pending contact request message
        const request = await Message.findOne({
            senderId: userId,
            receiverId: currentUserId,
            isContactRequest: true,
            requestStatus: "pending"
        }).populate("senderId", "fullName profilePic");

        if (!request) {
            return res.status(200).json(null);
        }

        res.status(200).json({
            _id: request._id,
            sender: {
                _id: request.senderId._id,
                fullName: request.senderId.fullName,
                profilePic: request.senderId.profilePic
            },
            text: request.text,
            createdAt: request.createdAt,
            isContactRequest: true
        });

    } catch (error) {
        console.log("Error in checkPendingRequest:", error.message);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};