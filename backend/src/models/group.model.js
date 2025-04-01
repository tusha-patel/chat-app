// Group model (MongoDB)
import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastMessage: {
        type: String,
        default: null,
    },
    lastMessageTime: {
        type: Date,
        default: null
    },
    unreadCounts: {
        type: Map,
        of: Number,
        default: new Map(),
    }
}, { timestamps: true });


const Group = mongoose.model('Group', groupSchema);
export default Group;