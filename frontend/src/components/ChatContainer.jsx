import React, { useEffect } from 'react'
import { useChatStore } from '../store/useChatStore'
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import MessageSkeleton from './skeleton/MessageSkeleton';
import { useAuthStore } from '../store/useAuthStore';
import { formatMessageTime } from '../lib/Utils';
import { useRef } from "react"
const ChatContainer = () => {
    const messagesEndRef = useRef();
    const { messages, getMessages, isMessagesLoading, selectedUser, subscribeToMessage, unsubscribeFromMessage } = useChatStore();
    const { authUser } = useAuthStore();


    // get the messages
    useEffect(() => {
        getMessages(selectedUser?._id);
        subscribeToMessage()
        return () => unsubscribeFromMessage()
    }, [selectedUser?._id, getMessages, subscribeToMessage, unsubscribeFromMessage]);

    // scroll to bottom whenever messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);




    // message loading...
    if (isMessagesLoading) {
        return (
            <div className='flex-1 flex flex-col overflow-auto'>
                <ChatHeader />
                <MessageSkeleton />
                <MessageInput />
            </div>
        )
    }

    return (
        <div className='flex flex-col flex-1 overflow-auto' >
            <ChatHeader />
            <div className='flex-1 overflow-y-auto p-4 space-y-4  ' >
                {messages?.map((message) => (
                    <div key={message._id}
                        className={`chat ${message.senderId == authUser._id ? "chat-end " : "chat-start"} `} >
                        {/* avatar section */}
                        <div className="chat-image avatar ">
                            <div className="size-10 rounded-full border ">
                                <img src={
                                    message.senderId === authUser._id ?
                                        authUser.profilePic || "/avatar.png" :
                                        selectedUser.profilePic || "/avatar.png"
                                } alt="profile image" />
                            </div>
                        </div>

                        {/* time section */}
                        <div className="chat-header mb-1 ">
                            <time className='text-xs opacity-50 ml-1' >{formatMessageTime(message.createdAt)}</time>
                        </div>
                        {/* user messages */}
                        <div className="chat-bubble flex flex-col ">
                            {message.image && (
                                <img src={message.image} alt="Attachment" className='sm:max-w-[200px] rounded-md mb-2' />
                            )}
                            {message.text && <p>{message.text}</p>}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef}></div>
            </div>
            <MessageInput />
        </div>
    )
}

export default ChatContainer