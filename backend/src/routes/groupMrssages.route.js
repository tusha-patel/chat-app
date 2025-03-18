import express from "express"
import protectRoute from "../middleware/auth.middleware.js";
import { getGroupMessages, sendGroupMessage } from "../controllers/groupMessages.controller.js";


const router = express();


router.post('/send_group_message', protectRoute, sendGroupMessage);
router.get("/get_group_message/:groupId", protectRoute, getGroupMessages)

export default router;