import { Server } from "socket.io";
import http from "http";
import express from "express";
import Group from "../models/group.model.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173"]
    },
});

// Store online users
const userSocketMap = {};
export const activeGroupRooms = {};
export const activeChatSessions = {};

export function getReceiverSocketId(userId) {
    return userSocketMap[userId];
}

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    const userId = socket.handshake.query.userId;
    console.log(userId, "user id");

    if (userId) {
        userSocketMap[userId] = socket.id;

        socket.on("enterChat", (contactId) => {
            console.log(contactId, "for user");

            activeChatSessions[userId] = contactId;
            socket.emit("markMessagesAsRead", contactId);
        });

        socket.on("leaveChat", () => {
            delete activeChatSessions[userId];
        });
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("joinGroup", async (groupId) => {
        console.log(`User ${userId} joined group ${groupId}`);
        socket.join(groupId);

        if (!activeGroupRooms[userId]) {
            activeGroupRooms[userId] = new Set();
        }
        activeGroupRooms[userId].add(groupId);

        try {
            await Group.findByIdAndUpdate(groupId, {
                $set: { [`unreadCounts.${userId}`]: 0 }
            }).exec();
        } catch (error) {
            console.error("Error resetting group unread count:", error);
        }
    });

    socket.on("leaveGroup", (groupId) => {
        console.log(`User ${userId} leave group ${groupId}`);
        socket.leave(groupId);

        if (activeGroupRooms[userId]) {
            activeGroupRooms[userId].delete(groupId);
        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        delete userSocketMap[userId];
        delete activeGroupRooms[userId];
        delete activeChatSessions[userId];
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

export { io, app, server };