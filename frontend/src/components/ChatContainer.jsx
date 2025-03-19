import React, { useEffect } from 'react'
import { useChatStore } from '../store/useChatStore'
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import MessageSkeleton from './skeleton/MessageSkeleton';
import { useAuthStore } from '../store/useAuthStore';
import { formatMessageTime } from '../lib/Utils';
import { useRef } from "react"
import { Download, File } from 'lucide-react';
import { useGroupStore } from '../store/useGroupStore';
const ChatContainer = () => {
    const messagesEndRef = useRef();
    const { messages, getMessages, isMessagesLoading, selectedUser, subscribeToMessage, unsubscribeFromMessage } = useChatStore();
    const { authUser, socket } = useAuthStore();
    const { groupMessages, getGroupMessages, subscribeGroup, isGroupMessagesLoading } = useGroupStore();
    const isGroupChat = selectedUser?.members;
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
    }, [getGroupMessages, selectedUser?._id, socket])

    const getFileType = (fileUrl) => {
        const extension = fileUrl.split('.').pop().toLowerCase();
        if (['pdf'].includes(extension)) return 'pdf';
        if (['zip', 'rar', '7z'].includes(extension)) return 'zip';
        if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) return 'image';
        return 'other';
    };

    // Render file-specific UI
    const renderFile = (file) => {
        console.log(file.name);

        if (!file || !file.url) return null;

        const fileType = getFileType(file.name);
        let fileUrl = file.url;
        // const fileUrl = file.url.includes('.') ? file.url : `${file.url}.${file.name.split('.').pop()}`;

        switch (fileType) {
            case 'pdf':
                return (
                    <a href={fileUrl} target="_blank" download={file.name} rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:underline">
                        <File size={16} /> View PDF
                    </a>
                );
            case 'zip':
                return (
                    <a href={fileUrl} download={file.name} className="flex items-center gap-2 text-green-500 hover:underline">
                        <Download size={16} /> {file.name}
                    </a>
                );
            case 'image':
                return (
                    <img src={fileUrl} alt="Attachment" download={file.name} className="sm:max-w-[200px] rounded-md mb-2" />
                );
            default:
                return (
                    <a href={fileUrl} download={file.name} target="_blank" className="flex items-center gap-2 text-gray-400 hover:underline">
                        <Download size={16} /> {file.name}
                    </a>
                );
        }
    };



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
            <div className='flex-1 overflow-y-auto p-4 space-y-4  ' >
                {currentMessages?.map((message) => (
                    <div key={message._id}
                        className={`chat ${message?.senderId == authUser?._id || message?.sender?._id === authUser?._id || message?.sender === authUser?._id ? "chat-end " : "chat-start"}`}>
                        {/* Avatar section */}
                        <div className="chat-image avatar">
                            <div className="size-10 rounded-full border">
                                <img
                                    src={
                                        message.senderId === authUser._id ?
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
                            {message.image && (
                                <img src={message.image} alt="Attachment" className='sm:max-w-[200px] rounded-md mb-2' />
                            )}
                            {message.text || message.message && <p>{message.text || message.message}</p>}
                            {message.file && renderFile(message.file)}
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