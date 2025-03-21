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
            set((state) => ({ groups: [...state.groups, res.data] }));
        } catch (error) {
            console.log("Error creating group:", error);
            toast.error(error.response.data.message);
        } finally {
            set({ isGroupLoading: false });
        }
    },

    // Listen for new groups in real-time
    listenForGroupUpdates: (socket) => {
        socket.on("groupCreated", (newGroup) => {
            // console.log("New group received via socket:", newGroup);
            set((state) => ({
                groups: [...state.groups, newGroup],
            }));
            toast.success("new group created");
        });
    },
    subscribeGroup: () => {
        const socket = useAuthStore.getState().socket;

        // for new message
        socket.on("newMessage", (message) => {
            // console.log(message);

            if (message.groupId) {
                set((state) => ({
                    groupMessages: [
                        ...state.groupMessages,
                        {
                            ...message,
                            replyMsg: message.replyMsg || null,
                        },
                    ],
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
            // console.log(updatedGroupMessage);
            set((state) => ({
                groupMessages: state.groupMessages.map((message) =>
                    message._id === updatedGroupMessage._id ? updatedGroupMessage : message
                ),
            }));
        });
    },

    // get the group
    getGroup: async () => {
        set({ isGroupLoading: true });
        try {
            const res = await axiosInstance.get("/group/fetch");
            set({ groups: res.data })
            // set((state) => ({ groups: [...state.groups, res.data] }));
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
            console.log(messageId);
            const res = await axiosInstance.put(`/group/message//update_group_message/${messageId}`, { text });
            console.log(res);
            toast.success("message update success")
            // set({ groupMessages: res.data });
        } catch (error) {
            console.log("error form group message delete store", error);
            toast.error(error.response.data.message);
        }
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
    }

}));


