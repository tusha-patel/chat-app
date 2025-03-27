import React from 'react'
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';

const UserDetails = ({ profilePic, user, name }) => {
    const { selectedUser, setSelectedUser } = useChatStore();
    const { onlineUsers } = useAuthStore();
    return (
        <div>
            <button
                onClick={() => setSelectedUser(user)}
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
                <div className="hidden lg:block text-left min-w-0 ">
                    <p className='capitalize font-medium truncate ' >{name}</p>
                    <div className="text-zinc-400 text-sm">
                        {user?.members ? user.members.map((user) => (
                            <span key={user._id}>{`${user?.fullName} `}</span>
                        )) :
                            <div>
                                {user?.lastMessage ? (
                                    <span>{user?.lastMessage}</span>
                                ) : (
                                    <span>No messages</span>
                                )}
                            </div>
                        }
                    </div>
                </div>
            </button>
        </div>
    )
}

export default UserDetails