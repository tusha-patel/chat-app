import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client"


const BASE_URL = "http://localhost:5001"

export const useAuthStore = create((set, get) => ({
    authUser: null,
    isSigningUp: false,
    isLoggIng: false,
    isUpdateProfile: false,
    contacts: [],
    // online users
    onlineUsers: [],

    // loading
    isCheckingAuth: true,
    socket: null,

    // user is login or not
    checkAuth: async () => {
        try {
            const res = await axiosInstance.get("/auth/check");
            // console.log(res);
            set({ authUser: res.data });
            get().connectSocket();
        } catch (error) {
            console.log("Error in CheckAuth", error);
            set({ authUser: null })
        } finally {
            set({ isCheckingAuth: false });
        }
    },


    // signup 
    signUp: async (data) => {
        set({ isSigningUp: true })
        try {
            const res = await axiosInstance.post("/auth/signup", data);
            set({ authUser: res.data })
            toast.success("Account created successfully");
            get().connectSocket()
        } catch (error) {
            console.log("Error from signup ", error);
            toast.error(error.response.data.message);
        } finally {
            set({ isSigningUp: false })
        }
    },

    // logout
    logout: async () => {
        try {
            const res = await axiosInstance.post("/auth/logout");
            console.log(res);
            set({ authUser: null });
            toast.success("Logged out successfully");
            get().disconnectSocket();
        } catch (error) {
            console.log("error in logout from useAuthStore ", error);
            toast.error(error.response.data.message);
        }
    },


    // login
    login: async (data) => {
        set({ isLoggIng: true });
        try {
            const res = await axiosInstance.post("/auth/login", data);
            // console.log(res);
            set({ authUser: res.data });
            toast.success("logged in successfully");
            get().connectSocket();
        } catch (error) {
            console.log("error in login from useAuthStore ", error);
            toast.error(error.response.data.message);
        } finally {
            set({ isLoggIng: false });
        }
    },


    // update the profile
    updateProfile: async (data) => {
        set({ isUpdateProfile: true });
        try {
            const res = await axiosInstance.put("/auth/update_profile", data);
            set({ authUser: res.data });
            toast.success("profile update success");
        } catch (error) {
            console.log("error for update profile", error);
            toast.error(error.response.data.message);
        } finally {
            set({ isUpdateProfile: false });
        }
    },

    getUserContacts: async (userId) => {
        try {
            const res = await axiosInstance.get(`/auth/get_user_contacts/${userId}`);
            console.log(res);
            set({ contacts: res.data });
        } catch (error) {
            console.log("Error in getUserContacts", error);
            toast.error(error.response.data.message);
        }
    },
    // send contact request
    sendContactRequest: async (receiverId) => {
        try {
            const res = await axiosInstance.post("/auth/send_request", { receiverId });
            console.log(res);
            toast.success("Contact request send");
        } catch (error) {
            console.log("Error in sendContactRequest", error);
            toast.error(error.response.data.message);
        }
    },

    handleContactRequest: async (senderId, action) => {
        try {
            const res = await axiosInstance.post("/auth/handle_request", { senderId, action });
            console.log(res);
            toast.success(`Request ${action}ed`);
        } catch (error) {
            console.log("Error in handleContactRequest", error);
            toast.error(error.response.data.message);
        }
    },

    // search user
    searchUser: async (email) => {
        try {
            const res = await axiosInstance.get(`/auth/search?email=${email}`);
            console.log(res);

            return res.data;
        } catch (error) {
            console.log("Error in searchUser", error);
            toast.error(error.response.data.message);
        }
    },

    // connect the socket io
    connectSocket: () => {
        const { authUser } = get();
        if (!authUser || get().socket?.connected) return

        // send the user id for online users
        const socket = io(BASE_URL, {
            query: {
                userId: authUser._id,
            }
        });
        socket.connect();
        set({ socket: socket });

        // get the online users
        socket.on("getOnlineUsers", (userIds) => {
            set({ onlineUsers: userIds })
        });
    },

    // disconnect the socket io
    disconnectSocket: () => {
        if (get().socket?.connected) get().socket.disconnect();
    }
}));
