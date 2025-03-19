import React, { useEffect, useState } from 'react'
import { useChatStore } from '../store/useChatStore'
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import MessageSkeleton from './skeleton/MessageSkeleton';
import { useAuthStore } from '../store/useAuthStore';
import { formatMessageTime } from '../lib/Utils';
import { useRef } from "react"
import { Reply } from 'lucide-react';
import { useGroupStore } from '../store/useGroupStore';
import renderFile from '../lib/file';
const ChatContainer = () => {
    const messagesEndRef = useRef();
    const { messages, getMessages, isMessagesLoading, selectedUser, subscribeToMessage, unsubscribeFromMessage } = useChatStore();
    const { authUser, socket } = useAuthStore();
    const { groupMessages, getGroupMessages, subscribeGroup, isGroupMessagesLoading } = useGroupStore();
    const isGroupChat = selectedUser?.members;
    let [replyMsg, setReplyMsg] = useState(null);


    // get the messages
    useEffect(() => {
        getMessages(selectedUser?._id);
        subscribeToMessage()
        return () => unsubscribeFromMessage()
    }, [selectedUser?._id, getMessages, subscribeToMessage, unsubscribeFromMessage]);

    // scroll to bottom whenever messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, groupMessages]);


    // get the group messages
    useEffect(() => {
        getGroupMessages(selectedUser?._id);
        if (socket) {
            subscribeGroup(socket);
        }
    }, [getGroupMessages, selectedUser?._id, socket, subscribeGroup])



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


    const currentMessages = isGroupChat ? groupMessages : messages;

    return (
        <div className='flex flex-col flex-1 overflow-auto' >
            <ChatHeader />
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${replyMsg && "mb-10"} `} >
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
                        <div className="chat-header mb-1">
                            <time className='text-xs opacity-50 ml-1'>{formatMessageTime(message.createdAt)}</time>
                        </div>

                        {/* User messages */}
                        <div className="chat-bubble flex flex-col">
                            {/* {message.senderId === authUser._id || message?.senderId._id == authUser._id ? ( */}
                            <div className='flex gap-2 ' >
                                <div>
                                    {message.replyMsg &&
                                        <div className='bg-base-200 py-2 px-3 rounded mb-2 ' >
                                            <div>{message.replyMsg.text || message.replyMsg.message}</div>
                                            <div>{message.replyMsg.image && <img src={message.replyMsg.image} className='h-16 w-16 object-contain  ' alt="" />}</div>
                                            <div className='py-2' >{message.replyMsg?.file && renderFile(message.replyMsg?.file)}</div>
                                            <div className='text-[12px]' >{message.replyMsg?.senderId?.fullName} , {formatMessageTime(message.replyMsg.createdAt)}</div>
                                        </div>}
                                    {message.image && (
                                        <img src={message.image} alt="Attachment" className='sm:max-w-[200px] rounded-md mb-2' />
                                    )}
                                    {message.text || message.message && <p>{message.text || message.message}</p>}
                                    {message?.file && renderFile(message?.file)}
                                </div>
                                <div className='' >
                                    <button className='cursor-pointer' onClick={() => setReplyMsg(message)} ><Reply /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef}></div>
            </div>
            <MessageInput replyMsg={replyMsg} setReplyMsg={setReplyMsg} />
        </div>
    )
}

export default ChatContainer