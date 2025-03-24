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

export const sendContactRequest = async (req, res) => {
    try {
        const { receiverId } = req.body;
        const senderId = req.user._id;

        if (!receiverId) {
            return res.status(400).json({ message: "Receiver ID is required" });
        }

        // Find sender and receiver
        const sender = await User.findById(senderId);
        const receiver = await User.findById(receiverId);

        if (!receiver || !sender) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if contact request already exists
        const existingRequestReceiver = receiver.contacts.find(contact => contact.userId.equals(senderId));
        const existingRequestSender = sender.contacts.find(contact => contact.userId.equals(receiverId));

        if (existingRequestReceiver || existingRequestSender) {
            return res.status(400).json({ message: "Contact request already sent" });
        }

        // Add request to receiver's contacts
        receiver.contacts.push({ userId: senderId, status: "pending" });

        // Add request to sender's contacts
        sender.contacts.push({ userId: receiverId, status: "pending" });

        // Save both users
        await receiver.save();
        await sender.save();

        res.status(200).json({ message: "Contact request sent successfully" });
    } catch (error) {
        console.log("Error in sendContactRequest controller", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Handle Accept or Block Contact Request
export const handleContactRequest = async (req, res) => {
    try {
        const userId = req.user._id;
        const { senderId, action } = req.body;

        if (!userId || !senderId || !["accept", "block"].includes(action)) {
            return res.status(400).json({ message: "Invalid request data" });
        }

        // Fetch both users (Receiver & Sender)
        const receiver = await User.findById(userId);
        const sender = await User.findById(senderId);

        if (!receiver || !sender) {
            return res.status(404).json({ message: "User not found" });
        }

        // Find contact requests in both users
        const receiverContactIndex = receiver.contacts.findIndex(contact => contact.userId.toString() === senderId);
        const senderContactIndex = sender.contacts.findIndex(contact => contact.userId.toString() === userId);

        if (receiverContactIndex === -1 || senderContactIndex === -1) {
            return res.status(404).json({ message: "Contact request not found" });
        }

        if (action === "accept") {
            // Update both users to "accepted"
            receiver.contacts[receiverContactIndex].status = "accepted";
            sender.contacts[senderContactIndex].status = "accepted";
        } else if (action === "block") {
            // Remove the contact request from both users
            receiver.contacts.splice(receiverContactIndex, 1);
            sender.contacts.splice(senderContactIndex, 1);
        }

        // Save both users
        await receiver.save();
        await sender.save();

        res.status(200).json({ message: `Request ${action}ed successfully` });

    } catch (error) {
        console.log("Error in handleContactRequest controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};



// get user for only accept the request

export const getUsersContacts = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).populate("contacts.userId", "fullName email profilePic ")

        if (!user) {
            return res.status(404).json({ message: "user not found" });
        }

        const contacts = user.contacts.filter(contact => contact.status == "accepted");
        res.status(200).json(contacts);

    } catch (error) {
        console.log("Error in getUsersContacts controller", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}


// search with email api
export const searchUserByEmail = async (req, res) => {
    try {
        const { email } = req.query;
        const loggedInUserId = req.user._id;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        // Find users whose email matches the search query
        const users = await User.find({
            email: { $regex: email, $options: "i" },
            _id: { $ne: loggedInUserId }
        }).select("-password");

        if (users.length === 0) {
            return res.status(404).json({ message: "No users found" });
        }

        res.status(200).json(users);
    } catch (error) {
        console.log("Error in searchUsers controller", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

