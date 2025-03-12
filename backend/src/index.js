import express from "express";
import authRoute from "./routes/auth.route.js"
import dotenv from "dotenv";
import connectDB from "./lib/db.js";
import cookieParser from "cookie-parser"
import messageRoute from "./routes/message.route.js"
import cors from "cors"
import { app, server } from "./lib/socket.js";
// env file config
dotenv.config();

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
// receiving the body data 
app.use(express.json());

// receiving the cookies data
app.use(cookieParser());

// create a route
app.use("/api/auth", authRoute);    
app.use("/api/messages", messageRoute);


const PORT = process.env.PORT;
// create a server
server.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
    // connect mongodb database
    connectDB();
});