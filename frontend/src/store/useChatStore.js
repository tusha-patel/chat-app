import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
    messages: [],
    users: [],
    selectedUser: null,
    isUsersLoading: false,
    isMessagesLoading: false,


    getUsers: async () => {
        set({ isUsersLoading: true })
        try {
            const res = await axiosInstance.get("/messages/users");
            set({ users: res.data });
        } catch (error) {
            console.log("error in getUsers from useChatStore", error);
            toast.error(error.response.data.message);
        } finally {
            set({ isUsersLoading: false })
        }
    },


    // get messages
    getMessages: async (userId) => {
        set({ isMessagesLoading: true });
        try {
            const res = await axiosInstance.get(`/messages/${userId}`);
            // console.log(res);
            set({ messages: res.data });
        } catch (error) {
            console.log("error from getMessages in useChatStore", error);
            toast.error(error.response.data.message)
        } finally {
            set({ isMessagesLoading: false });
        }
    },

    // send the messages
    sendMessage: async (messageData) => {
        try {
            const { selectedUser, messages } = get();
            const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
            set({ messages: [...messages, res.data] });
        } catch (error) {
            console.log("error from sendMessage in useChatStore", error);
            toast.error(error.response.data.message);
        }
    },

    // delete message
    deleteMessage: async (messageId) => {
        try {
            const res = await axiosInstance.delete(`/messages/delete/${messageId}`);
            console.log(res);
            toast.success("Message delete success")
        } catch (error) {
            console.log("error from sendMessage in useChatStore", error);
            toast.error(error.response.data.message);
        }
    },

    // update message
    updateMessage: async ({ messageId, text }) => {
        try {
            const res = await axiosInstance.put(`/messages/update/${messageId}`, { text });
            console.log(res);
            toast.success("message update success")
        } catch (error) {
            console.log("error from sendMessage in useChatStore", error);
            toast.error(error.response.data.message);
        }
    },

    // live message send user using socket io
    // Subscribe to new messages and deletions
    subscribeToMessage: () => {
        const { selectedUser } = get();
        if (!selectedUser) return;

        const socket = useAuthStore.getState().socket;
        // Listen for new message 
        socket.on("newMessage", (newMessage) => {
            const isMessageSentFromSelectedUser = newMessage.senderId._id === selectedUser._id;
            // console.log(newMessage);
            if (!isMessageSentFromSelectedUser) return;
            if (!newMessage.groupId) {
                set((state) => ({
                    messages: [
                        ...state.messages,
                        { ...newMessage, replyMsg: newMessage.replyMsg || null },
                    ],
                }));
            }
        });

        // Listen for message deletions
        socket.on("messageDeleted", ({ messageId }) => {
            // console.log(messageId);

            set((state) => ({
                messages: state.messages.filter(msg => msg._id !== messageId)
            }));
        });

        //Listen for message updated
        socket.on("messageEdited", (updatedMessage) => {
            // console.log(updatedMessage);

            set((state) => ({
                messages: state.messages.map((msg) =>
                    msg._id === updatedMessage._id ? updatedMessage : msg
                ),
            }));
        });

    },

    // Unsubscribe from events
    unsubscribeFromMessage: () => {
        const socket = useAuthStore.getState().socket;
        socket.off("newMessage");
        socket.off("messageDeleted");  // Remove listener on unmount
    },


    // set selected user in sidebar
    setSelectedUser: (selectedUser) => set({ selectedUser })
}));