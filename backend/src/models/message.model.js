import mongoose from "mongoose";

// create a message model
const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    text: {
        type: String,
    },
    image: {
        type: String,
    },
    file: {
        url: String,
        name: String,
    },
    replyOff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null,
    },
    isDeleted: { type: Boolean, default: false },
    isContactRequest: {
        type: Boolean,
        default: false
    },
    requestStatus: {
        type: String,
        enum: ["pending", "accepted", "declined"],
        default: "pending"
    }
}, { timestamps: true });

const Message = mongoose.model("Message", messageSchema);

export default Message;