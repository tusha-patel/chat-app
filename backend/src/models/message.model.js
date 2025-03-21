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
    replyMsg: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null,
    },
}, { timestamps: true });

const Message = mongoose.model("Message", messageSchema);

export default Message;