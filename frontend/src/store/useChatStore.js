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
    contactRequests: [],



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

    // live message send user using socket io
    // Subscribe to new messages and deletions
    subscribeToMessage: () => {
        const socket = useAuthStore.getState().socket;

        // Listen for new messages
        socket.on("newMessage", (newMessage) => {
            // if (newMessage.showRequestModal) {
            //     console.log(newMessage);
            // }
            console.log(newMessage);

            set((state) => ({
                messages: [
                    ...state.messages,
                    { ...newMessage, replyOff: newMessage.replyOff || null },
                ],
                users: state.users.map((user) =>
                    user._id === newMessage.senderId._id || user._id === newMessage.receiverId._id
                        ? {
                            ...user,
                            lastMessage: newMessage.text || (newMessage.file ? newMessage.file.name : null) || (newMessage.image ? "photo" : null),
                            lastMessageTime: newMessage.createdAt,
                        }
                        : user
                ),
            }));
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

        // Listen for incoming requests
        socket.on("pendingContactRequest", (data) => {
            useChatStore.setState((state) => ({
                contactRequests: [...state.contactRequests, data],
            }));
        });
        socket.on("contactStatusUpdated", ({ senderId, receiverId, status }) => {
            const { authUser } = get();
            const isCurrentUserInvolved =
                senderId === authUser._id || receiverId === authUser._id;

            if (isCurrentUserInvolved) {
                set((state) => ({
                    users: state.users.map(user => {
                        if (user._id === senderId || user._id === receiverId) {
                            const updatedContacts = user.contacts.map(contact => {
                                const contactUserId = contact.userId._id || contact.userId;
                                if (
                                    (contactUserId === senderId || contactUserId === receiverId) &&
                                    contactUserId !== user._id
                                ) {
                                    return { ...contact, status };
                                }
                                return contact;
                            });
                            return { ...user, contacts: updatedContacts };
                        }
                        return user;
                    }),
                    selectedUser: state.selectedUser?._id === senderId ||
                        state.selectedUser?._id === receiverId
                        ? {
                            ...state.selectedUser,
                            contacts: state.selectedUser.contacts.map(contact => {
                                const contactUserId = contact.userId._id || contact.userId;
                                if (
                                    (contactUserId === senderId || contactUserId === receiverId) &&
                                    contactUserId !== state.selectedUser._id
                                ) {
                                    return { ...contact, status };
                                }
                                return contact;
                            })
                        }
                        : state.selectedUser
                }));
            }

        });
    },
    acceptContact: (senderId) => {
        const socket = useAuthStore.getState().socket;
        socket.emit("acceptContact", senderId);
        set((state) => ({
            contactRequests: state.contactRequests.filter((req) => req.senderId !== senderId),
        }));
    },

    blockContact: (senderId) => {
        const socket = useAuthStore.getState().socket;
        socket.emit("blockContact", senderId);
        set((state) => ({
            contactRequests: state.contactRequests.filter((req) => req.senderId !== senderId),
        }));
    },
    // Unsubscribe from events
    unsubscribeFromMessage: () => {
        const socket = useAuthStore.getState().socket;
        socket.off("newMessage");
        socket.off("messageDeleted");  // Remove listener on unmount
        socket.off("contactStatusUpdated");
    },


    // set selected user in sidebar
    setSelectedUser: (selectedUser) => set({ selectedUser })
}));