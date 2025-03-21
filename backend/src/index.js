import express from "express";
import authRoute from "./routes/auth.route.js"
import dotenv from "dotenv";
import connectDB from "./lib/db.js";
import cookieParser from "cookie-parser"
import messageRoute from "./routes/message.route.js"
import groupRoute from "./routes/group.route.js"
import groupMessageRoute from "./routes/groupMessages.route.js"
import cors from "cors"
import path from "path"
import { app, io, server } from "./lib/socket.js";
// env file config
dotenv.config();

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
const __dirname = path.resolve();
// receiving the body data 
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "src/uploads")));
// receiving the cookies data
app.use(cookieParser());

// create a route
app.use("/api/auth", authRoute);
app.use("/api/messages", messageRoute);
app.use("/api/group", groupRoute);
app.use("/api/group/message", groupMessageRoute);



const PORT = process.env.PORT;
// create a server
server.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
    // connect mongodb database
    connectDB();
});