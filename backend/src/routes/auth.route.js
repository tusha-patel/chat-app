import express from "express"
import { checkAuth, getUsersContacts, handleContactRequest, login, logout, searchUserByEmail, sendContactRequest, signup, updateProfile } from "../controllers/auth.controller.js";
import protectRoute from "../middleware/auth.middleware.js";
import upload from "../lib/upload.js";
const router = express.Router();

// authentication route
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

// update profile route
router.put("/update_profile", protectRoute, updateProfile)


// login user route
router.get("/check", protectRoute, checkAuth);


// for contacts request
router.post("/send_request", protectRoute, sendContactRequest);
router.post("/handle_request", protectRoute, handleContactRequest);
router.get("/get_user_contacts/:userId", protectRoute, getUsersContacts);
router.get("/search", protectRoute, searchUserByEmail);


export default router;