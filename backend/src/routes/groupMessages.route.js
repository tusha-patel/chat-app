import express from "express"
import protectRoute from "../middleware/auth.middleware.js";
import { deleteGroupMessage, getGroupMessages, resetUnreadCount, sendGroupMessage, updateGroupMessage } from "../controllers/groupMessages.controller.js";


const router = express();


router.post('/send_group_message', protectRoute, sendGroupMessage);
router.get("/get_group_message/:groupId", protectRoute, getGroupMessages)
router.delete("/delete_group_message/:messageId", protectRoute, deleteGroupMessage);
router.put("/update_group_message/:messageId", protectRoute, updateGroupMessage);
router.patch("/:groupId/resetUnread", protectRoute, resetUnreadCount);

export default router;