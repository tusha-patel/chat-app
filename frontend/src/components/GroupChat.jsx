import React, { useState } from 'react'
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { useGroupStore } from '../store/useGroupStore';
import SidebarSkeleton from './skeleton/SidebarSkeleton';
const GroupChat = ({ setGroup }) => {
    const { acceptedContacts, selectedUser } = useChatStore();
    const [groupName, setGroupName] = useState('');
    const [groupMembers, setGroupMembers] = useState([]);
    const { onlineUsers } = useAuthStore();
    const { authUser } = useAuthStore();
    const { createGroup, isGroupLoading } = useGroupStore();

    // set all the group members
    const toggleGroupMember = (userId) => {
        setGroupMembers((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId]
        );
    };

    // create the new group
    const handleCreateGroup = () => {
        try {
            if (!groupName || groupMembers.length < 1) {
                return alert('Group needs a name and at least 1 member besides you');
            }

            // Ensure logged-in user (authUser) is always part of the group
            const members = [...new Set([...groupMembers, authUser._id])];
            let data = {
                groupName,
                members
            }
            createGroup(data);
            setGroupName('');
            setGroup(false);
            setGroupMembers([]);
        } catch (error) {
            console.log("error from create group", error);
        }
    }

    if (isGroupLoading) return <SidebarSkeleton />

    return (
        <div>
            <input type='text' className='p-2 border border-base-300 w-full shadow-2xl rounded ' value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder='Group Name' />
            <button onClick={handleCreateGroup} className='w-full bg-primary p-2 rounded mt-2 cursor-pointer ' >Create Group</button>
            {acceptedContacts?.map((user) => (
                <button key={user._id}
                    className={`w-full flex gap-3 items-center p-3 hover:bg-base-300  cursor-pointer transition-colors 
                            ${selectedUser?._id == user?._id ? " bg-base-300 ring-1 ring-base-300 " : ""} `} >
                    <input type='checkbox' checked={groupMembers.includes(user._id)} onChange={() => toggleGroupMember(user._id)} />
                    <div className="relative mx-auto lg:mx-0 ">
                        {/* avatar section */}
                        <img src={user?.profilePic || "/avatar.png"}
                            className='size-11 object-cover rounded-full '
                            alt={user.fullName} title={user.fullName} />

                        {/* online user section */}
                        {onlineUsers.includes(user._id) && (
                            <span className='size-3 rounded-full bg-green-500 absolute bottom-0 right-0
                                    ring-1 ring-zinc-900
                                '/>
                        )}
                    </div>

                    {/* user info Only visible on larger screen */}
                    <div className="hidden lg:block text-left min-w-0 ">
                        <p className='capitalize font-medium truncate ' >{user.fullName}</p>
                        <div className='text-zinc-400 text-sm' >
                            {onlineUsers.includes(user?._id) ? "Online" : "Offline"}
                        </div>
                    </div>
                </button>
            ))}

        </div>
    )
}

export default GroupChat