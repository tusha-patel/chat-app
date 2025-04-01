import cloudinary from "../lib/cloudinary.js";
import { activeGroupRooms, getReceiverSocketId, io } from "../lib/socket.js";
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
        const lastMessageContent = text || (file ? file.name : null) || (image ? "photo" : null);
        await Group.findByIdAndUpdate(groupId, {
            lastMessage: lastMessageContent,
            lastMessageTime: newMessage.createdAt,
        });


        const membersToUpdate = group.members.filter(memberId =>
            memberId.toString() !== userId.toString()
        );

        // Prepare update operations
        const updateOperations = membersToUpdate.map(memberId => {
            // Check if member is active in this group
            const isActive = activeGroupRooms[memberId] &&
                activeGroupRooms[memberId].has(groupId.toString());

            return {
                updateOne: {
                    filter: { _id: groupId },
                    update: {
                        $set: {
                            lastMessage: lastMessageContent,
                            lastMessageTime: newMessage.createdAt
                        },
                        // Only increment if not active in group
                        $inc: { [`unreadCounts.${memberId}`]: isActive ? 0 : 1 }
                    }
                }
            };
        });
        await Group.bulkWrite(updateOperations);

        // Get updated group with unread counts
        const updatedGroup = await Group.findById(groupId);

        // Emit to all members individually with their specific unread count
        membersToUpdate.forEach(memberId => {
            const memberSocketId = getReceiverSocketId(memberId);
            if (memberSocketId) {
                io.to(memberSocketId).emit("updateGroupUnread", {
                    groupId,
                    lastMessage: lastMessageContent,
                    lastMessageTime: newMessage.createdAt,
                    unreadCount: updatedGroup.unreadCounts.get(memberId.toString()) || 0
                });
            }
        });
        io.to(groupId.toString()).emit("groupLastMessageUpdate", {
            groupId,
            lastMessage: lastMessageContent,
            lastMessageTime: newMessage.createdAt,
        });
        // console.log("Emitting new message to group:", groupId, populatedMessage);
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
        const { groupId } = groupMessage;

        // Find the last non-deleted message in the group
        const lastMessageContent = await GroupMessage.findOne({ groupId, isDeleted: false })
            .sort({ createdAt: -1 }) // Get the latest message
            .select("message createdAt file image")
            .lean();
        // console.log(lastMessageContent);

        // Determine last message content
        const newLastMessage = lastMessageContent
            ? lastMessageContent.message || (lastMessageContent.file ? lastMessageContent.file.name : null) || (lastMessageContent.image ? "photo" : null)
            : null;

        // Update group's lastMessage and lastMessageTime
        await Group.findByIdAndUpdate(groupId, {
            lastMessage: newLastMessage,
            lastMessageTime: lastMessageContent ? lastMessageContent.createdAt : null,
        });

        // Emit updated last message
        io.to(groupId.toString()).emit("groupLastMessageUpdate", {
            groupId,
            lastMessage: newLastMessage,
            lastMessageTime: lastMessageContent ? lastMessageContent.createdAt : null,
        });
        // io.to(groupId).emit("groupMessageDeleted", { messageId });
        // Emit the event to notify users about the deleted message
        io.to(groupId.toString()).emit("groupMessageDeleted", { messageId });
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
        });

        if (!updatedGroupMessage) {
            return res.status(404).json({ message: "Message not found." });
        }
        const { groupId } = updatedGroupMessage;

        const lastMessageContent = updatedGroupMessage.message;
        const lastMessageTime = new Date();
        await Group.findByIdAndUpdate(groupId, {
            lastMessage: lastMessageContent,
            lastMessageTime: lastMessageTime,
        });
        // console.log(lastMessageContent);
        // Emit the updated message to all group members
        io.to(groupId.toString()).emit("editGroupMessages", updatedGroupMessage);
        io.to(groupId.toString()).emit("groupLastMessageUpdate", {
            groupId,
            lastMessage: lastMessageContent,
            lastMessageTime: lastMessageTime,
        });
        res.status(200).json(updatedGroupMessage);
    } catch (error) {
        console.error('Error updating group message:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const resetUnreadCount = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        // Update the group and get the updated document
        const updatedGroup = await Group.findByIdAndUpdate(
            groupId,
            { $set: { [`unreadCounts.${userId}`]: 0 } },
            { new: true } // Return the updated document
        );

        // Emit real-time update to all group members
        io.to(groupId.toString()).emit("unreadCountReset", {
            groupId,
            userId,
            unreadCounts: updatedGroup?.unreadCounts
        });

        res.status(200).json({ message: "Unread count reset" });
    } catch (error) {
        console.error('Error resetting unread count:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};