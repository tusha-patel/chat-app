import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs"

// authentication controller

// signup
export const signup = async (req, res) => {
    try {
        const { email, fullName, password } = req.body;

        // all filed required
        if (!email || !fullName || !password) {
            return res.status(400).json({
                message: "All filed required"
            })
        }
        // find password minimum length
        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 character"
            });
        }
        // check the use is already register
        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({
                message: "Email already exists"
            })
        }
        // bcrypt password
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        // create new user
        const newUser = new User({
            email,
            fullName,
            password: hashPassword
        });

        if (newUser) {
            generateToken(newUser._id, res);
            await newUser.save();

            res.status(201).json({
                _id: newUser._id,
                fullName: newUser.fullName,
                email: newUser.email,
                profilePic: newUser.profilePic
            });
        } else {
            return res.status(400).json({
                message: "data not valid"
            })
        }
    } catch (error) {
        console.log("Error in signup controller", error.message);
        res.status(500).json({
            message: "Internal server error"
        });
    }
}

// login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // check user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                message: "Invalid credentials"
            })
        }

        // check valid password
        const isPasswordCorrect = await bcrypt.compare(password, user.password)
        if (!isPasswordCorrect) {
            return res.status(400).json({
                message: "Invalid credentials"
            })
        }

        // user login & generate the jwt token
        generateToken(user._id, res);
        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            profilePic: user.profilePic
        });
    } catch (error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({
            message: "Internal server error"
        });
    }
}

// logout
export const logout = (req, res) => {
    try {
        res.cookie("jwt", "", {
            maxAge: 0
        });
        res.status(200).json({ message: "Logged out successfully" })
    } catch (error) {
        console.log("Error in logout controller", error.message);
        res.status(500).json({ message: "Internal Server Error " })
    }
}

// update profile  
export const updateProfile = async (req, res) => {
    try {
        const { profilePic } = req.body;
        const userId = req.user._id;

        if (!profilePic) {
            return res.status(400).json({ message: "Profile pic is required" })
        }
        const uploadResponse = await cloudinary.uploader.upload(profilePic, {
            folder: "chat_app"
        });

        const updateUser = await User.findByIdAndUpdate(userId, {
            profilePic: uploadResponse.secure_url
        }, { new: true });

        res.status(200).json(updateUser);
    } catch (error) {
        console.log("error in update profile ", error);
        res.status(500).json({ message: "internal server error" })
    }
}


// find login user
export const checkAuth = async (req, res) => {
    try {
        res.status(200).json(req.user);
    } catch (error) {
        console.log("Error in checkAuth controller", error.message);
        res.status(500).json({ message: "Internal server error" })
    }
}



