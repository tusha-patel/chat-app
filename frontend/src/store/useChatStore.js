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
    acceptedContacts: [],
    pendingContacts: [],


    getUsers: async () => {
        set({ isUsersLoading: true })
        try {
            const res = await axiosInstance.get("/messages/users");
            console.log(res);
            set({
                acceptedContacts: res.data.acceptedContacts,
                pendingContacts: res.data.pendingContacts
            })
            // set({ users: res.data });
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
    markMessagesAsRead: async (senderId) => {
        try {
            const res = await axiosInstance.put(`/messages/${senderId}/resetUnread`);
            console.log(res);

        } catch (error) {
            console.log("Error markMessagesAsRead request:", error);
            toast.error("Failed to accept request");
        }
    },

    // Subscribe to new messages and deletions
    subscribeToMessage: () => {
        const socket = useAuthStore.getState().socket;

        // Listen for new messages
        socket.on("newMessage", (newMessage) => {
            set((state) => {
                const { selectedUser } = state;
                const shouldAddMessage = selectedUser &&
                    (newMessage.senderId._id === selectedUser._id ||
                        newMessage.receiverId._id === selectedUser._id);
                return {
                    messages: shouldAddMessage
                        ? [...state.messages, { ...newMessage, replyOff: newMessage.replyOff || null }]
                        : state.messages
                };
            });
        });
        socket.on("contactUpdated", ({ contactId, lastMessage, lastMessageTime, unreadCounts }) => {
            set((state) => ({
                acceptedContacts: state.acceptedContacts.map(contact =>
                    contact._id === contactId
                        ? { ...contact, lastMessage, lastMessageTime, unreadCounts }
                        : contact
                ),
                pendingContacts: state.pendingContacts.map(contact =>
                    contact._id === contactId
                        ? { ...contact, lastMessage, lastMessageTime, unreadCounts }
                        : contact
                ),
            }));
        });

        // Listen for message deletions
        socket.on("messageDeleted", ({ messageId, lastMessage, lastMessageTime, chatUserId }) => {
            set((state) => {
                // Update messages list
                const updatedMessages = state.messages.filter(msg => msg._id !== messageId);

                // Update last message in contacts
                const updatedAcceptedContacts = state.acceptedContacts.map(contact => {
                    if (contact._id === chatUserId) {
                        return {
                            ...contact,
                            lastMessage,
                            lastMessageTime
                        };
                    }
                    return contact;
                });

                return {
                    messages: updatedMessages,
                    acceptedContacts: updatedAcceptedContacts
                };
            });
        });

        // Listen for message updates
        socket.on("messageEdited", (updatedMessage) => {
            set((state) => {
                const lastMessage = state.messages.length
                    ? state.messages[state.messages.length - 1]
                    : null;

                const shouldUpdateLastMessage = lastMessage && lastMessage._id === updatedMessage._id;

                return {
                    messages: state.messages.map((msg) =>
                        msg._id === updatedMessage._id ? updatedMessage : msg
                    ),
                    acceptedContacts: state.acceptedContacts.map((contact) =>
                        (contact._id === updatedMessage.senderId._id || contact._id === updatedMessage.receiverId._id) &&
                            shouldUpdateLastMessage
                            ? { ...contact, lastMessage: updatedMessage.text, lastMessageTime: updatedMessage.createdAt }
                            : contact
                    )
                };
            });
        });

    },
    newUpgradeMessage: () => {
        const socket = useAuthStore.getState().socket;

        socket.on("updateContactUnread", ({ contactId, unreadCounts, lastMessage, lastMessageTime }) => {
            // console.log(contactId, unreadCounts, lastMessage, lastMessageTime, "dbsegdfjhwevsdvb");

            set((state) => ({
                acceptedContacts: state.acceptedContacts.map(contact =>
                    contact?._id === contactId
                        ? {
                            ...contact,
                            unreadCounts,
                            lastMessage,
                            lastMessageTime
                        }
                        : contact
                ),
                pendingContacts: state.pendingContacts.map(contact =>
                    contact._id === contactId
                        ? {
                            ...contact,
                            unreadCounts,
                            lastMessage,
                            lastMessageTime
                        }
                        : contact
                )
            }));
        });
        socket.on("messagesRead", ({ contactId, unreadCounts }) => {
            set((state) => ({
                acceptedContacts: state.acceptedContacts.map(contact =>
                    contact._id === contactId
                        ? { ...contact, unreadCounts }
                        : contact
                ),
                pendingContacts: state.pendingContacts.map(contact =>
                    contact._id === contactId
                        ? { ...contact, unreadCounts }
                        : contact
                )
            }));
        });
    },
    newContactRequest: () => {
        const socket = useAuthStore.getState().socket;
        socket.on("newContactRequest", (newContact) => {
            set((state) => {
                // Check if this contact already exists in pendingContacts
                const contactExists = state.pendingContacts.some(
                    contact => contact._id === newContact.senderId._id
                );

                // Also check if it exists in acceptedContacts (just in case)
                const isAlreadyAccepted = state.acceptedContacts.some(
                    contact => contact._id === newContact.senderId._id
                );

                if (!contactExists && !isAlreadyAccepted) {
                    return {
                        pendingContacts: [...state.pendingContacts, {
                            ...newContact.senderId,
                            status: "pending",
                            lastMessage: newContact.lastMessage,
                            lastMessageTime: newContact.lastMessageTime
                        }]
                    };
                }
                return state;
            });
        });

        socket.on("contactRequestAccepted", ({ receiverId, receiver }) => {
            console.log(receiverId, receiver);

            set((state) => ({
                acceptedContacts: [...state.acceptedContacts, receiver],
                pendingContacts: state.pendingContacts.filter(
                    (contact) => contact._id !== receiverId
                ),
            }));
            toast.success("Contact request accepted! You are now connected.");
        });

        socket.on("contactRequestDeclined", ({ senderId }) => {
            set((state) => ({
                pendingContacts: state.pendingContacts.filter(
                    (contact) => contact._id !== senderId
                ),
                selectedUser: state.selectedUser?._id === senderId ? null : state.selectedUser
            }));
        });
    },

    // Unsubscribe from events
    unsubscribeFromMessage: () => {
        const socket = useAuthStore.getState().socket;
        socket.off("newMessage");
        socket.off("messageDeleted"); 
        socket.off("contactUpdated");
        socket.off("messageEdited");
    },
    returnContactRequest: () => {
        const socket = useAuthStore.getState().socket;
        socket.off("newContactRequest");
        socket.off("contactRequestAccepted");
        socket.off("contactRequestDeclined");
    },

    returnNewUpgradeMessage: () => {
        const socket = useAuthStore.getState().socket;
        socket.off("updateContactUnread");
        socket.off("messagesRead");
    },


    // set selected user in sidebar
    setSelectedUser: (selectedUser) => set({ selectedUser })
}));