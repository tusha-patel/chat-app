import cloudinary from "../lib/cloudinary.js";
import { activeChatSessions, getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import path from "path"

// get all user without the login user
export const getUserForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;

        const user = await User.findById(loggedInUserId)
            .populate({
                path: "contacts.userId",
                select: "fullName email profilePic"
            })
            .lean();

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Separate accepted and pending contacts
        const acceptedContacts = user.contacts
            .filter(contact => contact.status === "accepted")
            .map(contact => ({
                ...contact.userId,
                lastMessage: contact.lastMessage,
                lastMessageTime: contact.lastMessageTime,
                contactStatus: "accepted",
                unreadCounts: contact.unreadCounts,
            }));

        const pendingContacts = user.contacts
            .filter(contact => contact.status === "pending")
            .map(contact => ({
                ...contact.userId,
                contactStatus: "pending",
                lastMessage: contact.lastMessage,
                lastMessageTime: contact.lastMessageTime,
                initiatedBy: contact.initiatedBy,
                unreadCounts: contact.unreadCounts,
            }));

        res.status(200).json({
            acceptedContacts,
            pendingContacts
        });
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

// export const sendMessage = async (req, res) => {
//     try {
//         const { text, image, file, replyOff } = req.body;
//         const { id: receiverId } = req.params;
//         const senderId = req.user._id;

//         // Check if users exist
//         const sender = await User.findById(senderId);
//         const receiver = await User.findById(receiverId);
//         if (!sender || !receiver) {
//             return res.status(404).json({ message: "User not found" });
//         }

//         // Initialize contacts if not exists
//         if (!sender.contacts) sender.contacts = [];
//         if (!receiver.contacts) receiver.contacts = [];

//         // Check if users are contacts
//         const isContact = sender.contacts.some(
//             contact => contact.userId.equals(receiverId) && contact.status === "accepted"
//         );

//         // Check receiver status
//         const isReceiverActive = getReceiverSocketId(receiverId) !== undefined;
//         const isReceiverInChat = activeChatSessions[receiverId] === senderId;

//         // Handle file uploads
//         let imageUrl, fileUrl;
//         if (image) {
//             const uploadResponse = await cloudinary.uploader.upload(image);
//             imageUrl = uploadResponse.secure_url;
//         }
//         if (file) {
//             if (file.size > 100 * 1024 * 1024) {
//                 return res.status(413).json({ message: "File size exceeds 100MB limit." });
//             }
//             const fileExt = path.extname(file.name);
//             const uploadResponse = await cloudinary.uploader.upload(file.data, {
//                 resource_type: "raw",
//                 folder: "chat_app",
//                 use_filename: true,
//                 unique_filename: false,
//                 format: fileExt.substring(1),
//             });
//             fileUrl = uploadResponse.secure_url;
//         }

//         // Create message
//         const newMessage = new Message({
//             senderId,
//             receiverId,
//             text,
//             image: imageUrl,
//             file: file ? { url: fileUrl, name: file.name } : null,
//             replyOff: replyOff ? replyOff : null,
//             isContactRequest: !isContact,
//             requestStatus: !isContact ? "pending" : undefined,
//             isRead: isReceiverActive && isReceiverInChat
//         });

//         await newMessage.save();

//         // Populate message details
//         const populatedMessage = await Message.findById(newMessage._id)
//             .populate({
//                 path: "replyOff",
//                 select: ["text", "image", "file", "createdAt"],
//                 populate: {
//                     path: "senderId",
//                     select: "fullName",
//                 },
//             })
//             .populate("senderId", "fullName profilePic")
//             .populate("receiverId", "fullName profilePic");

//         // Update last message and unread counts
//         const lastMessageContent = text || (file ? file.name : null) || (image ? "photo" : null);
//         const lastMessageTime = new Date();

//         // Update sender's contact record
//         let senderContact = sender.contacts.find(c => c.userId.equals(receiverId));
//         if (!senderContact) {
//             senderContact = {
//                 userId: receiverId,
//                 status: isContact ? "accepted" : "pending",
//                 lastMessage: lastMessageContent,
//                 lastMessageTime: lastMessageTime,
//                 unreadCounts: 0,
//                 initiatedBy: senderId
//             };
//             sender.contacts.push(senderContact);
//         } else {
//             senderContact.lastMessage = lastMessageContent;
//             senderContact.lastMessageTime = lastMessageTime;
//             senderContact.unreadCounts = 0;
//         }

//         // Update receiver's contact record
//         let receiverContact = receiver.contacts.find(c => c.userId.equals(senderId));
//         if (!receiverContact) {
//             receiverContact = {
//                 userId: senderId,
//                 status: isContact ? "accepted" : "pending",
//                 lastMessage: lastMessageContent,
//                 lastMessageTime: lastMessageTime,
//                 unreadCounts: (isReceiverActive && isReceiverInChat) ? 0 : 1,
//                 initiatedBy: senderId
//             };
//             receiver.contacts.push(receiverContact);
//         } else {
//             receiverContact.lastMessage = lastMessageContent;
//             receiverContact.lastMessageTime = lastMessageTime;
//             if (!(isReceiverActive && isReceiverInChat)) {
//                 receiverContact.unreadCounts += 1;
//             } else {
//                 receiverContact.unreadCounts = 0;
//             }
//         }

//         await sender.save();
//         await receiver.save();

//         // Socket.io emissions
//         const senderSocketId = getReceiverSocketId(senderId);
//         const receiverSocketId = getReceiverSocketId(receiverId);

//         // Emit to sender
//         if (senderSocketId) {
//             io.to(senderSocketId).emit("newMessage", populatedMessage);
//             io.to(senderSocketId).emit("contactUpdated", {
//                 contactId: receiverId,
//                 lastMessage: lastMessageContent,
//                 lastMessageTime: lastMessageTime,
//                 unreadCounts: 0
//             });
//         }

//         // Emit to receiver if online
//         if (receiverSocketId) {
//             io.to(receiverSocketId).emit("newMessage", populatedMessage);
//             io.to(receiverSocketId).emit("contactUpdated", {
//                 contactId: senderId,
//                 lastMessage: lastMessageContent,
//                 lastMessageTime: lastMessageTime,
//                 unreadCounts: receiverContact.unreadCounts
//             });

//             if (!isReceiverInChat) {
//                 io.to(receiverSocketId).emit("newMessageNotification", {
//                     senderId,
//                     message: lastMessageContent,
//                     unreadCount: receiverContact.unreadCounts
//                 });
//             }
//         }

//         res.status(200).json({
//             ...populatedMessage.toObject(),
//             isContactRequest: !isContact
//         });

//     } catch (error) {
//         console.log("Error in sendMessage controller:", error.message);
//         res.status(500).json({ message: "Internal server error" });
//     }
// };
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
        const hasPendingRequest = await Message.findOne({
            $or: [
                { senderId, receiverId, isContactRequest: true, requestStatus: "pending" },
                { senderId: receiverId, receiverId: senderId, isContactRequest: true, requestStatus: "pending" }
            ]
        });
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

        // Check receiver status
        const isReceiverActive = getReceiverSocketId(receiverId) !== undefined;
        const isReceiverInChat = activeChatSessions[receiverId] === senderId.toString();

        // Create message (whether contact request or regular message)
        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
            file: file ? { url: fileUrl, name: file.name } : null,
            replyOff: replyOff ? replyOff : null,
            isContactRequest: !isContact && !hasPendingRequest,
            requestStatus: (!isContact && !hasPendingRequest) ? "pending" : undefined,
            isRead: isReceiverActive && isReceiverInChat
        });

        await newMessage.save();
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
        const lastMessageTime = new Date();

        // Update sender's contact record
        let senderContact = sender.contacts.find(c => c.userId.equals(receiverId));
        if (!senderContact) {
            senderContact = {
                userId: receiverId,
                status: isContact ? "accepted" : "pending",
                lastMessage: lastMessageContent,
                lastMessageTime: lastMessageTime,
                unreadCounts: 0,
                initiatedBy: senderId
            };
            sender.contacts.push(senderContact);
        } else {
            senderContact.lastMessage = lastMessageContent;
            senderContact.lastMessageTime = lastMessageTime;
            senderContact.unreadCounts = 0;
        }

        // Update receiver's contact record
        let receiverContact = receiver.contacts.find(c => c.userId.equals(senderId));
        if (!receiverContact) {
            receiverContact = {
                userId: senderId,
                status: isContact ? "accepted" : "pending",
                lastMessage: lastMessageContent || text,
                lastMessageTime: lastMessageTime,
                unreadCounts: (isReceiverActive && isReceiverInChat) ? 0 : 1,
                initiatedBy: senderId
            };
            receiver.contacts.push(receiverContact);
        } else {
            receiverContact.lastMessage = lastMessageContent;
            receiverContact.lastMessageTime = lastMessageTime;
            if (!(isReceiverActive && isReceiverInChat)) {
                receiverContact.unreadCounts += 1;
            } else {
                receiverContact.unreadCounts = 0;
            }
        }

        await sender.save();
        await receiver.save();

        // Emit socket events
        const senderSocketId = getReceiverSocketId(senderId);
        const receiverSocketId = getReceiverSocketId(receiverId);

        if (senderSocketId) {
            io.to(senderSocketId).emit("newMessage", populatedMessage);
            if (!isContact) {
                io.to(senderSocketId).emit("newContactRequest", {
                    senderId: receiver,
                    status: "pending",
                    lastMessage: lastMessageContent,
                    lastMessageTime: lastMessageTime,
                });
            }
            io.to(senderSocketId).emit("contactUpdated", {
                contactId: receiverId,
                lastMessage: lastMessageContent,
                lastMessageTime: lastMessageTime,
                unreadCounts: 0
            });
        }

        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", populatedMessage);
            if (!isContact) {
                io.to(receiverSocketId).emit("newContactRequest", {
                    senderId: sender,
                    status: "pending",
                    lastMessage: lastMessageContent,
                    lastMessageTime: lastMessageTime,
                });
            }
            io.to(receiverSocketId).emit("contactUpdated", {
                contactId: senderId,
                lastMessage: lastMessageContent,
                lastMessageTime: lastMessageTime,
                unreadCounts: receiverContact.unreadCounts
            });

            // Add this new emission for immediate sidebar update
            io.to(receiverSocketId).emit("updateContactUnread", {
                contactId: senderId,
                unreadCounts: receiverContact.unreadCounts,
                lastMessage: lastMessageContent,
                lastMessageTime: lastMessageTime
            });
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
        const lastMessage = await Message.findOne({
            $or: [
                { senderId, receiverId },
                { senderId: receiverId, receiverId: senderId }
            ],
            isDeleted: false,
            _id: { $ne: id } // Exclude the current deleted message
        })
            .sort({ createdAt: -1 })
            .lean();

        // Determine last message content
        const lastMessageContent = lastMessage ?
            lastMessage.text ||
            (lastMessage.file ? lastMessage.file.name : null) ||
            (lastMessage.image ? "photo" : null) :
            null;

        const lastMessageTime = lastMessage?.createdAt || null;

        // Update both users' contact records
        const updateUserContact = async (userId, contactUserId) => {
            await User.updateOne(
                { _id: userId, "contacts.userId": contactUserId },
                {
                    $set: {
                        "contacts.$.lastMessage": lastMessageContent,
                        "contacts.$.lastMessageTime": lastMessageTime
                    }
                }
            );
        };
        //  const lastMessageContent = text || (file ? file.name : null) || (image ? "photo" : null);
        //         await Group.findByIdAndUpdate(groupId, {
        //             lastMessage: lastMessageContent,
        //             lastMessageTime: newMessage.createdAt,
        //         });

        //         // // Emit last message update to all group members
        //         io.to(groupId.toString()).emit("groupLastMessageUpdate", {
        //             groupId,
        //             lastMessage: lastMessageContent,
        //             lastMessageTime: newMessage.createdAt,
        //         });

        await Promise.all([
            updateUserContact(senderId, receiverId),
            updateUserContact(receiverId, senderId)
        ]);
        // Emit the deletion event to both sender and receiver
        io.to(getReceiverSocketId(senderId)).emit("messageDeleted", {
            messageId: id,
            lastMessage: lastMessageContent,
            lastMessageTime,
            chatUserId: receiverId
        });

        io.to(getReceiverSocketId(receiverId)).emit("messageDeleted", {
            messageId: id,
            lastMessage: lastMessageContent,
            lastMessageTime,
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
            return res.status(400).json({ message: "Message not found" });
        }

        const updatedMessage = await Message.findByIdAndUpdate(
            messageId,
            { text: text },
            { new: true }
        )
            .populate({
                path: "replyOff",
                select: ["text", "image", "file", "createdAt"],
                populate: { path: "senderId", select: "fullName" },
            })
            .populate("senderId", "fullName")
            .populate("receiverId", "fullName");

        if (!updatedMessage) {
            return res.status(400).json({ message: "Message update failed. Try again!" });
        }

        const sender = await User.findById(updatedMessage.senderId._id);
        const receiver = await User.findById(updatedMessage.receiverId._id);

        if (!sender || !receiver) {
            return res.status(404).json({ message: "User not found" });
        }

        const lastMessageContent = updatedMessage.text;
        const lastMessageTime = new Date();

        // Update sender's contact record
        let senderContact = sender.contacts.find(c => c.userId.equals(receiver._id));
        if (senderContact) {
            senderContact.lastMessage = lastMessageContent;
            senderContact.lastMessageTime = lastMessageTime;
        }

        // Update receiver's contact record
        let receiverContact = receiver.contacts.find(c => c.userId.equals(sender._id));
        if (receiverContact) {
            receiverContact.lastMessage = lastMessageContent;
            receiverContact.lastMessageTime = lastMessageTime;
        }

        await sender.save();
        await receiver.save();

        // Emit socket event for real-time update
        io.emit("messageEdited", updatedMessage);
        io.emit("contactUpdated", {
            contactId: sender._id,
            lastMessage: lastMessageContent,
            lastMessageTime: lastMessageTime,
        });
        io.emit("contactUpdated", {
            contactId: receiver._id,
            lastMessage: lastMessageContent,
            lastMessageTime: lastMessageTime,
        });

        res.status(200).json(updatedMessage);
    } catch (error) {
        console.log("Error in updateMessage controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};




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

        if (action === "accept") {
            // Update contact status
            const senderContact = sender.contacts.find(c => c.userId.equals(receiverId.toString()));
            const receiverContact = receiver.contacts.find(c => c.userId.equals(senderId.toString()));

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
                    receiver
                });
            }

            return res.status(200).json({ message: "Contact request accepted" });

        } else if (action === "declined") {
            await Message.updateMany(
                {
                    $or: [
                        { senderId, receiverId },
                        { senderId: receiverId, receiverId: senderId }
                    ]
                },
                { $set: { isDeleted: true } }
            );
            // Remove contacts
            sender.contacts = sender.contacts.filter(c => !c.userId.equals(receiverId));
            receiver.contacts = receiver.contacts.filter(c => !c.userId.equals(senderId));

            // Update message status
            message.isDeleted = true;
            message.requestStatus = "declined";
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
            receiverId: request.receiverId._id,
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

export const markMessagesAsRead = async (req, res) => {
    try {
        const { senderId } = req.params;
        const receiverId = req.user._id;

        // Update all unread messages as read
        const updateResult = await Message.updateMany(
            {
                senderId: senderId,
                receiverId: receiverId,
                isRead: false
            },
            { $set: { isRead: true } }
        );

        // Update unread count in receiver's contacts
        const receiver = await User.findById(receiverId);
        const contactIndex = receiver.contacts.findIndex(c => c.userId.equals(senderId));

        if (contactIndex !== -1) {
            receiver.contacts[contactIndex].unreadCounts = 0;
            await receiver.save();
        }

        // Update active chat session
        activeChatSessions[receiverId] = senderId;

        // Emit socket events
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("messagesRead", {
                contactId: senderId,
                unreadCounts: 0
            });
        }

        // // Notify sender that messages were read
        // const senderSocketId = getReceiverSocketId(senderId);
        // if (senderSocketId) {
        //     io.to(senderSocketId).emit("messagesReadByReceiver", {
        //         contactId: receiverId
        //     });
        // }

        res.status(200).json({
            success: true,
            message: "Messages marked as read",
            updatedCount: updateResult.modifiedCount
        });
    } catch (error) {
        console.log("Error in markMessagesAsRead controller:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};