import express from "express";
import protectRoute from "../middleware/auth.middleware.js";
import { deleteMessage, getMessages, getUserForSidebar, sendMessage, updateMessage } from "../controllers/message.controller.js";

// messages routers
const router = express.Router();

// get all users
router.get("/users", protectRoute, getUserForSidebar);

// get select user message
router.get("/:id", protectRoute, getMessages);

// send the messages
router.post("/send/:id", protectRoute, sendMessage)

// delete message
router.delete("/delete/:id", protectRoute, deleteMessage)

// update message
router.put("/update/:messageId", protectRoute, updateMessage);


export default router; 