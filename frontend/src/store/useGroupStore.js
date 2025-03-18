import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

export const useGroupStore = create((set, get) => ({
    groups: [],
    isGroupLoading: false,
    groupMessages: [],


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
            set((state) => ({
                groups: [...state.groups, newGroup], // ✅ Add new group
            }));
            toast.success(`New group created: ${newGroup.name}`);
        });
    },
    subscribeGroup: (socket) => {
        socket.on("newMessage", (message) => {
            set((state) => ({
                groupMessages: [...state.groupMessages, message],
            }));
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
        }
    },
    sendGroupMessage: async (data) => {
        // console.log(data);
        const { groupMessages } = get();
        try {
            const res = await axiosInstance.post("/group/message/send_group_message", data);
            // console.log(res);
            set({ groupMessages: [...groupMessages, res.data] });


        } catch (error) {
            console.log("error form group message store", error);
            toast.error(error.response.data.message);
        }
    },

    getGroupMessages: async (groupId) => {
        // console.log(groupId);
        try {
            const res = await axiosInstance.get(`/group/message/get_group_message/${groupId}`)
            // console.log(res);
            set({ groupMessages: res.data });

        } catch (error) {
            console.log("error form group message store", error);
        }
    },
}));


