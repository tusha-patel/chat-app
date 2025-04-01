import express from "express"
import { checkAuth, login, logout, searchUserByEmail, signup, updateProfile } from "../controllers/auth.controller.js";
import protectRoute from "../middleware/auth.middleware.js";
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
router.get("/search", protectRoute, searchUserByEmail);


export default router;