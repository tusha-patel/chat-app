import React, { useEffect, useState } from 'react'
import { useChatStore } from '../store/useChatStore'
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import MessageSkeleton from './skeleton/MessageSkeleton';
import { useAuthStore } from '../store/useAuthStore';
import { formatMessageTime } from '../lib/Utils';
import { useRef } from "react"
import { EllipsisVertical, Reply, Copy, SquareX, Pencil } from 'lucide-react';
import { useGroupStore } from '../store/useGroupStore';
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import renderFile from '../lib/file';
const ChatContainer = () => {
    const messagesEndRef = useRef();
    const { users, messages, getMessages, isMessagesLoading, deleteMessage, selectedUser, subscribeToMessage, unsubscribeFromMessage, handleContactRequest } = useChatStore();
    const { authUser } = useAuthStore();
    const { groupMessages, getGroupMessages, subscribeGroup, isGroupMessagesLoading, deleteGroupMessage, unsubscribeGroupMessage } = useGroupStore();
    const isGroupChat = selectedUser?.members;
    let [replyOff, setreplyOff] = useState(null);
    const [editMessage, setEditMessage] = useState("");
    const [pendingRequest, setPendingRequest] = useState(null);

    // scroll to bottom whenever messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, groupMessages]);
    useEffect(() => {
        if (!selectedUser?._id) return;

        if (isGroupChat) {
            getGroupMessages(selectedUser._id);
            subscribeGroup();
            return () => unsubscribeGroupMessage();
        } else {
            getMessages(selectedUser._id);
            subscribeToMessage();
            return () => unsubscribeFromMessage();
        }
    }, [
        selectedUser?._id,
        isGroupChat,
        getMessages,
        getGroupMessages,
        subscribeToMessage,
        subscribeGroup,
        unsubscribeFromMessage,
        unsubscribeGroupMessage
    ]);
    // copy the message
    const handleCopyClick = async ({ text }) => {
        try {
            await window.navigator.clipboard.writeText(text);
            toast.success("Copied to clipboard")
        } catch (err) {
            console.log(err, "copy text error");
            toast.error("Copy to clipboard failed.");
        }
    }

    // delete message
    const handleDeleteMessage = async (messageId) => {
        // console.log(messageId);
        try {
            if (selectedUser?.members) {
                deleteGroupMessage(messageId)
            } else {
                await deleteMessage(messageId);
            }
        } catch (error) {
            console.error("Error deleting message:", error);
        }
    };
    useEffect(() => {
        if (!selectedUser?._id) return;

        const checkPendingRequest = async () => {
            try {
                const response = await axiosInstance.get(`/messages/pending_requests/${selectedUser._id}`);

                if (response.data) {
                    setPendingRequest(response.data);
                } else {
                    setPendingRequest(null);
                }

            } catch (error) {
                console.log("Error checking pending request:", error);
            }
        };

        checkPendingRequest();
    }, [selectedUser, users]);

    // handle request
    const handleRequest = async (action) => {
        try {
            await handleContactRequest(pendingRequest._id, action);

            if (action === "declined") {
                setPendingRequest(null);
                toast.success("Contact request Declined! You are not connected.");
            }

            if (action === "accept") {
                setPendingRequest(null);
                toast.success("Contact request accepted! You are now connected.");
            }
        } catch (error) {
            console.log("Error handling request:", error);
            toast.error("Failed to process request");
        }
    };
    // edit message
    const handleEditMessage = (messageId) => {
        try {
            setEditMessage(messageId);
        } catch (error) {
            console.error("Error deleting message:", error);
        }
    }

    // message loading...
    if (isMessagesLoading, isGroupMessagesLoading) {
        return (
            <div className='flex-1 flex flex-col overflow-auto'>
                <ChatHeader />
                <MessageSkeleton />
                <MessageInput />
            </div>
        )
    }

    // show user and group message combine
    const currentMessages = isGroupChat ? groupMessages : messages;

    return (
        <div className='flex flex-col flex-1 overflow-auto' >
            <ChatHeader />
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${replyOff && "mb-10"} `} >
                {pendingRequest && (
                    <>
                        <div className="flex-1 flex items-center justify-center">
                            <div className="card w-96 bg-base-100 shadow-xl">
                                <div className="card-body">
                                    <h2 className="card-title">Contact Request</h2>
                                    <p>{selectedUser.fullName} wants to chat with you</p>
                                    <div className="card-actions justify-end mt-4">
                                        <button
                                            onClick={() => handleRequest("declined")}
                                            className="btn btn-primary"
                                        >
                                            declined
                                        </button>
                                        <button
                                            onClick={() => handleRequest("accept")}
                                            className="btn btn-error"
                                        >
                                            Accept
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
                {currentMessages?.map((message) => (
                    <div key={message._id}
                        className={`chat ${message?.senderId == authUser?._id || message?.senderId._id == authUser._id ? "chat-end " : "chat-start"}`}>
                        {/* Avatar section */}
                        <div className="chat-image avatar">
                            <div className="size-10 rounded-full border">
                                <img
                                    src={
                                        message.senderId === authUser._id || message?.senderId._id == authUser._id ?
                                            authUser.profilePic || "/avatar.png" :
                                            selectedUser.profilePic || "/avatar.png"
                                    }
                                    alt="profile image"
                                />
                            </div>
                        </div>

                        {/* Time section */}
                        <div className="chat-header mb-1 text-xs opacity-50 ml-1">
                            {message.senderId._id !== authUser._id && <span className=' capitalize ' > {message?.senderId.fullName.split(" ")[0]},</span>}
                            <time className=''>{formatMessageTime(message.createdAt)}</time>
                        </div>

                        {/* User messages */}
                        <div className={`chat-bubble flex flex-col ${message?.senderId._id == authUser?._id ? "bg-primary/80 text-primary-content " : "bg-base-200"}`}>
                            <div className='flex gap-2  ' >
                                <div>
                                    {message.replyOff &&
                                        <div className={`py-2 px-3 rounded mb-2 ${message?.senderId._id == authUser?._id ? "bg-primary/50 text-primary-content " : "bg-base-100"} `} >
                                            <div>{message.replyOff.text || message.replyOff.message}</div>
                                            <div>{message.replyOff.image && <img src={message.replyOff.image} className='h-16 w-16 object-contain  ' alt="" />}</div>
                                            <div className='py-2' >{message.replyOff?.file && renderFile(message.replyOff?.file)}</div>
                                            <div className='text-[12px]' >{message.replyOff?.senderId?.fullName} , {formatMessageTime(message.replyOff.createdAt)}</div>
                                        </div>}
                                    {message.image && (
                                        <img src={message.image} alt="Attachment" className='sm:max-w-[200px] rounded-md mb-2' />
                                    )}
                                    {message.text || message.message && <p>{message.text || message.message}</p>}
                                    {message?.file && renderFile(message?.file)}
                                </div>
                                <div className={`dropdown  cursor-pointer mt-1 ${message?.senderId == authUser?._id || message?.senderId._id == authUser._id && "dropdown-end"}`}>
                                    <div tabIndex={0} ><EllipsisVertical size={16} /></div>
                                    <ul tabIndex={0} className="dropdown-content mt-2 menu bg-base-200 z-1 w-52 p-2 shadow-2xl ">
                                        <li><button className='cursor-pointer' onClick={() => setreplyOff(message)} ><Reply size={17} />Replay</button></li>
                                        {!message.file && <li><button onClick={() => handleCopyClick({ text: message.text || message.message, image: message.image })} > <Copy size={17} /> Copy</button> </li>}
                                        {message?.senderId == authUser?._id || message?.senderId._id == authUser._id && <li><button onClick={() => handleDeleteMessage(message._id)} > <SquareX size={17} />Remove</button> </li>}
                                        {message?.senderId == authUser?._id || message?.senderId._id == authUser._id &&
                                            <span>
                                                {message?.file || message?.image ? "" : <li><button onClick={() => handleEditMessage(message)} > <Pencil size={17} /> Edit</button> </li>}
                                            </span>
                                        }
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                <div ref={messagesEndRef}></div>
            </div>
            {pendingRequest ? (
                <div></div>
            ) :
                (
                    <MessageInput replyOff={replyOff} setreplyOff={setreplyOff} editMessage={editMessage} setEditMessage={setEditMessage} />
                )
            }
        </div>
    )
}

export default ChatContainer