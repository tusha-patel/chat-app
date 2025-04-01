import React, { useEffect } from 'react'
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { useGroupStore } from '../store/useGroupStore';
import { formatMessageDayName } from '../lib/Utils';

const UserDetails = ({ profilePic, user, name, unreadCount, lastMessage, lastMessageTime }) => {
    const { selectedUser, setSelectedUser, markMessagesAsRead } = useChatStore();
    const { readMessages } = useGroupStore();
    const { onlineUsers, socket } = useAuthStore();
    const handleSelectedUser = (user) => {
        try {
            setSelectedUser(user);
            readMessages(user._id);
            markMessagesAsRead(user._id)
        } catch (error) {
            console.log(error);
        }
    }
    
    useEffect(() => {
        socket.emit("enterChat", selectedUser?._id);
        return () => {
            socket.emit("leaveChat");
        };
    }, [socket, selectedUser?._id]);

    return (
        <div>
            <button
                onClick={() => handleSelectedUser(user)}
                className={`w-full flex gap-3 items-center p-3 hover:bg-base-300  cursor-pointer transition-colors 
                                ${selectedUser?._id == user?._id ? " bg-base-300 ring-1 ring-base-300 " : ""} `} >
                <div className="relative mx-auto lg:mx-0 ">
                    {/* avatar section */}
                    <img src={profilePic || "/avatar.png"}
                        className='size-11 object-cover rounded-full '
                        alt={user?.fullName} title={user?.fullName} />

                    {/* online user section */}
                    {onlineUsers.includes(user?._id) ? (
                        <span className='size-3 rounded-full bg-green-500 absolute bottom-0 right-0
                                        ring-1 ring-zinc-900
                                    '/>
                    ) : <span className='size-3 rounded-full bg-gray-500 absolute bottom-0 right-0
                                        ring-1 ring-zinc-900
                                    '/>
                    }
                </div>
                {/* user info Only visible on larger screen */}
                <div className="hidden lg:block text-left flex-1 ">
                    <div className='flex justify-between items-center ' >
                        <p className='capitalize font-medium truncate ' >{name}</p>
                        <span className='text-sm justify-content-end ' >{formatMessageDayName(lastMessageTime || user?.lastMessageTime)}</span>
                    </div>
                    <div className="text-zinc-400 text-sm flex items-center justify-between "  >
                        <div className='w-30 overflow-hidden whitespace-nowrap'>
                            {user?.lastMessage ? (
                                <span className='truncate block ' >{lastMessage || user?.lastMessage}</span>
                            ) : (
                                <span>No messages</span>
                            )}
                        </div>
                        <div className='text-right'>
                            {user?.unreadCounts > 0 && (
                                <span className="badge badge-xs badge-primary ">
                                    {user?.unreadCounts}
                                </span>
                            )}
                            {unreadCount > 0 && (
                                <span className="badge badge-xs badge-primary ">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </button>
        </div>
    )
}

export default UserDetails