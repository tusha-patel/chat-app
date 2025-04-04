import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    fullName: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    profilePic: {
        type: String,
        default: ""
    },
    contacts: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "declined"],
            default: "pending"
        },
        lastMessage: {
            type: String,
            default: null
        },
        lastMessageTime: {
            type: Date,
            default: null
        },
        initiatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        unreadCounts: {
            type: Number,
            default: 0,
        },
    }]

}, { timestamps: true });


const User = mongoose.model("User", userSchema);
export default User;
