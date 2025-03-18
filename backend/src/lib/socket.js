import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173"]
    },
});

// Store online users
const userSocketMap = {};

// Get receiver socket ID function (move this **below** userSocketMap)
export function getReceiverSocketId(userId) {
    return userSocketMap[userId];
}

// Socket connection
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    const userId = socket.handshake.query.userId;
    if (userId) userSocketMap[userId] = socket.id;

    // Emit list of online users
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("joinGroup", (groupId) => {
        console.log(`User ${userId} joined group ${groupId}`);
        socket.join(groupId);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        delete userSocketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

export { io, app, server };
