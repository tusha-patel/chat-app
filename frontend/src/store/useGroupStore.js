import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";
import { useChatStore } from "./useChatStore";

export const useGroupStore = create((set, get) => ({
    groups: [],
    isGroupLoading: false,
    groupMessages: [],
    isGroupMessagesLoading: false,


    // create new group
    createGroup: async (data) => {
        set({ isGroupLoading: true });
        try {
            const res = await axiosInstance.post("/group/create/", data);
            console.log(res);

            // set((state) => ({ groups: [...state.groups, res.data] }));
        } catch (error) {
            console.log("Error creating group:", error);
            toast.error(error.response.data.message);
        } finally {
            set({ isGroupLoading: false });
        }
    },
    readMessages: async (groupId) => {
        try {
            let res = axiosInstance.patch(`/group/message/${groupId}/resetUnread`);
            console.log(res);

        } catch (error) {
            console.log(error, "error from read message");

        }
    },

    // get the group
    getGroup: async () => {
        set({ isGroupLoading: true });
        try {
            const res = await axiosInstance.get("/group/fetch");
            // console.log(res);
            set({ groups: res.data })
        } catch (error) {
            console.log("error form group message store", error);
            toast.error(error.response.data.message);
        } finally {
            set({ isGroupLoading: false });
        }
    },

    // get all the group
    getGroupMessages: async (groupId) => {
        set({ isGroupMessagesLoading: true })
        try {
            const res = await axiosInstance.get(`/group/message/get_group_message/${groupId}`)
            set({ groupMessages: res.data });
        } catch (error) {
            console.log("error form group message store", error);
        } finally {
            set({ isGroupMessagesLoading: false })
        }
    },

    // send group messages
    sendGroupMessage: async (data) => {
        set({ isGroupMessagesLoading: true })
        const { groupMessages } = get();
        try {
            const res = await axiosInstance.post("/group/message/send_group_message", data);
            set({ groupMessages: [...groupMessages, res.data] });
            // console.log(res);

        } catch (error) {
            console.log("error form group message store", error);
            toast.error(error.response.data.message);
        } finally {
            set({ isGroupMessagesLoading: false })
        }
    },

    // delete the group messages
    deleteGroupMessage: async (messageId) => {
        try {
            const res = await axiosInstance.delete(`/group/message/delete_group_message/${messageId}`);
            console.log(res);
            toast.success("Message delete success")
        } catch (error) {
            console.log("error form group message delete store", error);
            toast.error(error.response.data.message);
        }
    },
    // update the group messages
    updateGroupMessage: async ({ messageId, text }) => {
        try {
            // console.log(messageId);
            await axiosInstance.put(`/group/message//update_group_message/${messageId}`, { text });
            // console.log(res);
            toast.success("message update success")
            // set({ groupMessages: res.data });
        } catch (error) {
            console.log("error form group message delete store", error);
            toast.error(error.response.data.message);
        }
    },
    
    listenForGroupUpdates: () => {
        const socket = useAuthStore.getState().socket;
        socket.on("groupCreated", (newGroup) => {
            console.log(newGroup);

            set((state) => {
                // Check if group already exists in state
                const groupExists = state.groups.some(g => g._id === newGroup._id);
                if (!groupExists) {
                    return {
                        groups: [...state.groups, newGroup],
                    };
                }
                toast.success("New group created ")
                return state;
            });
        });
        socket.on("updateGroupUnread", ({ groupId, lastMessage, lastMessageTime, unreadCount }) => {
            set((state) => ({
                groups: state.groups.map(group =>
                    group._id === groupId
                        ? {
                            ...group,
                            lastMessage,
                            lastMessageTime,
                            unreadCounts: {
                                ...group.unreadCounts,
                                [useAuthStore.getState().authUser?._id]: unreadCount
                            }
                        }
                        : group
                ),
            }));
        });
    },
    subscribeGroup: (groupId) => {
        const socket = useAuthStore.getState().socket;
        if (!socket || !groupId) return;


        // Listen for new messages
        socket.on("newMessage", (message) => {
            if (message.groupId === groupId) {
                set((state) => {
                    const exists = state.groupMessages.some(
                        msg => msg._id === message._id
                    );

                    if (!exists) {
                        return {
                            groupMessages: [...state.groupMessages, message]
                        };
                    }
                    return state;
                });
            }
        });

        // Listen for last message updates with unread counts
        socket.on("groupLastMessageUpdate", ({ groupId: updatedGroupId, lastMessage, lastMessageTime, unreadCounts }) => {
            if (updatedGroupId === groupId) {
                set((state) => ({
                    groups: state.groups.map(group =>
                        group._id === updatedGroupId
                            ? {
                                ...group,
                                lastMessage,
                                lastMessageTime,
                                unreadCounts: unreadCounts || group.unreadCounts
                            }
                            : group
                    ),
                }));
            }
        });
        socket.on("unreadCountReset", ({ groupId: resetGroupId, unreadCounts }) => {
            if (resetGroupId === groupId) {
                set((state) => ({
                    groups: state.groups.map(group =>
                        group._id === resetGroupId
                            ? {
                                ...group,
                                unreadCounts: {
                                    ...group.unreadCounts,
                                    ...unreadCounts
                                }
                            }
                            : group
                    ),
                }));
            }
        });
        // Listen for deleted messages
        socket.on("groupMessageDeleted", ({ messageId }) => {
            set((state) => ({
                groupMessages: state.groupMessages.filter((message) => message._id !== messageId),
            }));
        });

        // Listen for updated messages
        socket.on("editGroupMessages", (updatedGroupMessage) => {
            set((state) => ({
                groupMessages: state.groupMessages.map((message) =>
                    message._id === updatedGroupMessage._id ? updatedGroupMessage : message
                ),
            }));
        });
    },
    // disconnect socket io
    unsubscribeGroupMessage: () => {
        const socket = useAuthStore.getState().socket;
        const selectedUser = useChatStore.getState().selectedUser;
        if (selectedUser?._id) {
            socket.emit("leaveGroup", selectedUser._id); // Ensure user leaves the previous group
        }
        socket.off("newMessage");
        socket.off("groupMessageDeleted");
        socket.off("groupLastMessageUpdate");
        socket.off("editGroupMessages");
        socket.off("unreadCountReset");
    },
    returnListenForGroupUpdates: () => {
        const socket = useAuthStore.getState().socket;
        socket.off("groupCreated");
        socket.off("updateGroupUnread");
    },
}));


