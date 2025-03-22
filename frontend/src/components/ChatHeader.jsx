import React from 'react'
import { useChatStore } from '../store/useChatStore'
import { useAuthStore } from '../store/useAuthStore';
import { X } from 'lucide-react';

const ChatHeader = () => {

    const { selectedUser, setSelectedUser } = useChatStore();
    const { onlineUsers } = useAuthStore();

    return (
        <div className="p-2.5 border-b border-base-300  ">
            <div className='flex justify-between items-center  ' >
                <div className="flex gap-3 items-center ">
                    {/* avatar info */}
                    <div className="avatar">
                        <div className="size-10 relative rounded-full ">
                            <img src={selectedUser?.profilePic || "/avatar.png"}
                                alt={selectedUser.fullName || selectedUser.name} />
                        </div>
                    </div>
                    {/* user content */}
                    <div>
                        <h3 className='font-medium capitalize  '>{selectedUser?.fullName || selectedUser.name}</h3>
                        <p className="text-sm text-base-content/70 flex gap-1">
                            {selectedUser?.members?.length > 0 ? (
                                <span className='capitalize' >{selectedUser.members.map(user => user.fullName).join(", ")}</span>
                            ) : (
                                <span>{onlineUsers.includes(selectedUser?._id) ? "Online" : "Offline"}</span>
                            )}
                        </p>
                    </div>
                </div>
                {/* close button */}
                <button onClick={() => setSelectedUser(null)} className='cursor-pointer' >
                    <X />
                </button>
            </div>
        </div>
    )
}

export default ChatHeader