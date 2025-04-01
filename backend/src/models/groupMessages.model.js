import mongoose from "mongoose";

// GroupMessage model (MongoDB)
const groupMessageSchema = new mongoose.Schema({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    image: {
        type: String
    },
    message: {
        type: String
    },
    file: {
        url: String,
        name: String,
    },
    replyOff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GroupMessage",
        default: null,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

const GroupMessage = mongoose.model('GroupMessage', groupMessageSchema);

export default GroupMessage;
