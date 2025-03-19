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
            console.log(res);
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
            console.log(error);

            console.log("error from sendMessage in useChatStore", error);
            toast.error(error.response.data.message)
        }
    },

    // live message send user using socket io
    subscribeToMessage: () => {
        const { selectedUser } = get();
        if (!selectedUser) return;

        const socket = useAuthStore.getState().socket;

        socket.on("newMessage", (newMessage) => {
            console.log(newMessage);

            // Ensure the message is from the selected user
            const isMessageSentFromSelectedUser = newMessage.senderId._id === selectedUser._id;
            if (!isMessageSentFromSelectedUser) return;

            set((state) => ({
                messages: [
                    ...state.messages,
                    {
                        ...newMessage,
                        replyMsg: newMessage.replyMsg || null, 
                    },
                ],
            }));
        });
    },


    // 
    unsubscribeFromMessage: () => {
        const socket = useAuthStore.getState().socket;
        socket.off("newMessage")
    },

    // set selected user in sidebar
    setSelectedUser: (selectedUser) => set({ selectedUser })
}));