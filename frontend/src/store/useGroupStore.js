import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

export const useGroupStore = create((set, get) => ({
    groups: [],
    isGroupLoading: false,
    groupMessages: [],
    isGroupMessagesLoading: false,


    createGroup: async (data) => {
        set({ isGroupLoading: true });
        try {
            const res = await axiosInstance.post("/group/create_group/", data);
            console.log(res);

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
        console.log("New group received via socket:", newGroup); 

        set((state) => ({
            groups: [...state.groups, newGroup], 
        }));
    });
},
    subscribeGroup: (socket) => {
        socket.on("newMessage", (message) => {
            console.log(message);

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
    sendGroupMessage: async (data) => {
        set({ isGroupMessagesLoading: true })
        const { groupMessages } = get();
        try {
            const res = await axiosInstance.post("/group/message/send_group_message", data);
            set({ groupMessages: [...groupMessages, res.data] });
            console.log(res);

        } catch (error) {
            console.log("error form group message store", error);
            toast.error(error.response.data.message);
        } finally {
            set({ isGroupMessagesLoading: false })
        }
    },

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
}));


