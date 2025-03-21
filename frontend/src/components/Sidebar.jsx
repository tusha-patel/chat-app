import React, { useEffect, useState } from 'react'
import { useChatStore } from '../store/useChatStore'
import SidebarSkeleton from './skeleton/SidebarSkeleton';
import { SquarePlus, Users } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import GroupChat from './GroupChat';
import { useGroupStore } from '../store/useGroupStore';

const Sidebar = () => {
    // fetch useChatStore;
    const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();

    // find the online user;
    const { onlineUsers, authUser: currentUser, socket } = useAuthStore();
    const [showOnlineOnly, setShowOnlineOnly] = useState(false);
    const [group, setGroup] = useState(false);
    const { getGroup, groups, listenForGroupUpdates } = useGroupStore();
    const [previousGroupId, setPreviousGroupId] = useState(null);

    // get the all users for side bar
    useEffect(() => {
        getUsers();
    }, [getUsers]);

    // for new group create
    useEffect(() => {
        getGroup();
    }, [getGroup]);

    useEffect(() => {
        if (socket) {
            listenForGroupUpdates(socket);
        }
    }, [socket, listenForGroupUpdates]);

    useEffect(() => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        // If a previous group exists, leave it first
        if (previousGroupId) {
            socket.emit("leaveGroup", previousGroupId);
        }

        if (selectedUser?._id) {
            socket.emit("joinGroup", selectedUser._id);
            setPreviousGroupId(selectedUser._id); // Update previous group after joining
        }
    }, [selectedUser, socket, previousGroupId]);

    const filteredUsers = showOnlineOnly ? users.filter((user) => onlineUsers.includes(user._id)) : users;
    const userGroups = groups.filter(group => group.members.some(member => member._id === currentUser._id));
    const sortedGroupsAndUsers = [...userGroups, ...filteredUsers];
    // console.log(sortedGroupsAndUsers);

    if (isUsersLoading) return <SidebarSkeleton />
    return (
        <aside className='h-full w-20 lg:w-64 border-r border-base-300 flex flex-col transition-all duration-200' >
            {/* filter online users */}
            <button className={`w-full flex gap-3 items-center p-5 hover:bg-base-300  cursor-pointer transition-colors border-b border-base-300 `} >
                <div className="relative mx-auto lg:mx-0 ">
                    {/* avatar section */}
                    <img src={currentUser?.profilePic || "/avatar.png"}
                        className='size-11 object-cover rounded-full '
                        alt={currentUser.fullName} title={currentUser.fullName} />

                    {/* online user section */}
                    {onlineUsers.includes(currentUser._id) && (
                        <span className='size-3 rounded-full bg-green-500 absolute bottom-0 right-0
                                    ring-1 ring-zinc-900
                                '/>
                    )}
                </div>

                {/* user info Only visible on larger screen */}
                <div className="lg:block text-left">
                    <p className='capitalize font-medium truncate ' >{currentUser.fullName || currentUser.name}</p>
                    <div className="text-zinc-400 text-sm">
                        <span>Set a status</span>
                    </div>
                </div>
            </button>

            <div className="border-b border-base-300 w-full p-5 ">
                <div className="flex items-center gap-2 ">
                    <div className="flex">
                        <Users className='size-6' />
                        <span className='font-medium hidden lg:block '>Contacts</span>
                    </div>
                    <div className="cursor-pointer" onClick={() => setGroup(!group)} >
                        <SquarePlus />
                    </div>
                </div>
                {/* filter toggle */}
                <div className="mt-3 hidden lg:flex ic' gap-2 ">
                    <label className='cursor-pointer flex items-center gap-2 '>
                        <input type="checkbox" checked={showOnlineOnly}
                            onChange={(e) => setShowOnlineOnly(e.target.checked)}
                            className='checkbox checkbox-sm'
                        />
                        <span className='text-sm'>Show online only</span>
                    </label>
                    <span>({onlineUsers.length - 1}online) </span>
                </div>
            </div>

            {/* set all  users */}
            <div className="w-full py-3 overflow-y-auto ">
                {!group && (
                    <div>
                        {sortedGroupsAndUsers?.map((user) => (
                            <button key={user._id}
                                onClick={() => setSelectedUser(user)}
                                className={`w-full flex gap-3 items-center p-3 hover:bg-base-300  cursor-pointer transition-colors 
                            ${selectedUser?._id == user?._id ? " bg-base-300 ring-1 ring-base-300 " : ""} `} >
                                <div className="relative mx-auto lg:mx-0 ">
                                    {/* avatar section */}
                                    <img src={user?.profilePic || "/avatar.png"}
                                        className='size-11 object-cover rounded-full '
                                        alt={user.fullName} title={user.fullName} />

                                    {/* online user section */}
                                    {onlineUsers.includes(user._id) ? (
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
                                    <p className='capitalize font-medium truncate ' >{user.fullName || user.name}</p>
                                    <div className="text-zinc-400 text-sm">
                                        {user?.members ? user.members.map((user) => (
                                            <span key={user._id}>{`${user.fullName} `}</span>
                                        )) :
                                            <div>
                                                {onlineUsers.includes(user?._id) ? "Online" : "Offline"}
                                            </div>
                                        }
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )
                }
                {group && (
                    <>
                        <GroupChat setGroup={setGroup} />
                    </>
                )}
                {filteredUsers.length === 0 && (
                    <div className='text-center text-zinc-500 py-4  ' >No Online users</div>
                )}
            </div>
        </aside>
    )
}

export default Sidebar