import { Server } from "socket.io";
import http from "http";
import express from "express"

const app = express();

// create http server
const server = http.createServer(app);

// create socket io server
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173"]
    },
});


export function getReceiverSocketId(userId) {
    return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {};

// connect the user with socket io in server
io.on("connection", (socket) => {
    // console.log("A user connected", socket.id);

    const userId = socket.handshake.query.userId;
    if (userId) userSocketMap[userId] = socket.id;


    // io.emit() is used to send events to all the connected clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap))

    socket.on("disconnect", () => {
        // console.log("A user disconnected", socket.id);
        delete userSocketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});



export { io, app, server }