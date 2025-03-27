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
    pendingRequests: [], // Store new contact requests


    getUsers: async () => {
        set({ isUsersLoading: true })
        try {
            const res = await axiosInstance.get("/messages/users");
            // console.log(res);
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
        // console.log(userId);

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

    getPendingUsers: async (selectedUserId) => {
        try {
            const response = await axiosInstance.get(`/messages/pending_requests/${selectedUserId}`);
            console.log(response);
            return response.data

        } catch (error) {
            console.log("Error checking pending request:", error);
        }
    },

    handleContactRequest: async (pendingRequestId, action) => {
        // console.log(pendingRequestId, action);

        try {
            let res = await axiosInstance.post("/messages/handle_request", {
                messageId: pendingRequestId,
                action: action
            });

            return res
        } catch (error) {
            console.log("Error accepting request:", error);
            toast.error("Failed to accept request");
        }
    },
    // live message send user using socket io
    // Subscribe to new messages and deletions
    subscribeToMessage: () => {
        const socket = useAuthStore.getState().socket;

        // Listen for new messages
        socket.on("newMessage", (newMessage) => {
            set((state) => {
                const { selectedUser } = state;

                // Only add messages that belong to the currently selected chat
                if (
                    selectedUser &&
                    (newMessage.senderId._id === selectedUser._id || newMessage.receiverId._id === selectedUser._id)
                ) {
                    return {
                        messages: [
                            ...state.messages,
                            { ...newMessage, replyOff: newMessage.replyOff || null },
                        ],
                        users: state.users.map((user) =>
                            user._id === newMessage.senderId._id || user._id === newMessage.receiverId._id
                                ? {
                                    ...user,
                                    lastMessage: newMessage.text ||
                                        (newMessage.file ? newMessage.file.name : null) ||
                                        (newMessage.image ? "photo" : null),
                                    lastMessageTime: newMessage.createdAt,
                                }
                                : user
                        ),
                    };
                }

                return {}; // Return unchanged state if message is not for selected user
            });
        });

        // Listen for message deletions
        socket.on("messageDeleted", ({ messageId, lastMessage, lastMessageTime, chatUserId }) => {
            set((state) => ({
                messages: state.messages.filter((msg) => msg._id !== messageId),
                users: state.users.map((user) =>
                    user._id === chatUserId
                        ? {
                            ...user,
                            lastMessage: lastMessage,
                            lastMessageTime: lastMessageTime,
                        }
                        : user
                ),
            }));
        });

        // Listen for message updates
        socket.on("messageEdited", (updatedMessage) => {
            set((state) => ({
                messages: state.messages.map((msg) =>
                    msg._id === updatedMessage._id ? updatedMessage : msg
                ),
                users: state.users.map((user) =>
                    user._id === updatedMessage.senderId._id || user._id === updatedMessage.receiverId._id
                        ? {
                            ...user,
                            lastMessage: updatedMessage.text,
                            lastMessageTime: updatedMessage.createdAt,
                        }
                        : user
                ),
            }));
        });

        // Listen for contact request decline

    },

    newContactRequest: () => {
        const socket = useAuthStore.getState().socket;

        socket.on("newContactRequest", (newContact) => {
            set((state) => {
                // Ensure the request is not duplicated
                const exists = state.pendingRequests.some(
                    (request) => request.senderId._id === newContact.senderId._id
                );
                if (!exists) {
                    return {
                        pendingRequests: [...state.pendingRequests, newContact],
                    };
                }
                return state;
            });
        });
        socket.on("contactRequestAccepted", ({ receiverId, newContact }) => {
            console.log("Request Accepted:", receiverId);

            set((state) => ({
                contacts: [...state.contacts, receiverId],
                users: [...state.users, newContact],
                pendingRequests: state.pendingRequests.filter((request) => request.senderId._id !== receiverId),
            }));

            toast.success("Contact request accepted! You are now connected.");
        });

        socket.on("contactRequestDeclined", ({ senderId }) => {
            console.log("Request Declined:", senderId);

            set((state) => ({
                pendingRequests: state.pendingRequests.filter((request) => request.senderId._id !== senderId),
                users: state.users.filter((user) => user._id !== senderId), // Remove from sidebar live
                selectedUser: null
            }));
        });
    },



    // Add this function to clear requests after they're handled
    // clearContactRequest: (requestId) => {
    //     set(state => ({
    //         incomingRequests: state.incomingRequests?.filter(req => req._id !== requestId)
    //     }));
    // },

    // Unsubscribe from events
    unsubscribeFromMessage: () => {
        const socket = useAuthStore.getState().socket;
        socket.off("newMessage");
        socket.off("messageDeleted");  // Remove listener on unmount
    },


    // set selected user in sidebar
    setSelectedUser: (selectedUser) => set({ selectedUser })
}));