import React, { useEffect, useState } from 'react'
import { useChatStore } from '../store/useChatStore'
import SidebarSkeleton from './skeleton/SidebarSkeleton';
import { LogIn, Search, SquarePlus, User, Users, X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import GroupChat from './GroupChat';
import { useGroupStore } from '../store/useGroupStore';
import UserDetails from './UserDetails';
// import toast from 'react-hot-toast';

const Sidebar = () => {
    const { getUsers, selectedUser, isUsersLoading, newContactRequest, acceptedContacts, pendingContacts, newUpgradeMessage, returnNewUpgradeMessage, returnContactRequest } = useChatStore();
    const { onlineUsers, authUser: currentUser, socket, searchUser } = useAuthStore();
    const [showOnlineOnly, setShowOnlineOnly] = useState(false);
    const [group, setGroup] = useState(false);
    const { getGroup, groups, listenForGroupUpdates, returnListenForGroupUpdates } = useGroupStore();
    const [previousGroupId, setPreviousGroupId] = useState(null);
    const [searchEmail, setSearchEmail] = useState("");
    const [searchedUser, setSearchedUser] = useState(null);
    const [showSearch, setShowSearch] = useState(false);


    // get the all users for side bar
    useEffect(() => {
        getUsers();
        if (socket) {
            newContactRequest();
            newUpgradeMessage();
        }
        return () => {
            returnContactRequest(),
                returnNewUpgradeMessage()
        };
    }, [getUsers, newContactRequest, socket, returnContactRequest, newUpgradeMessage, returnNewUpgradeMessage]);

    // for new group create
    useEffect(() => {
        getGroup();
        // if (socket) {
        listenForGroupUpdates();
        // }
        return () => returnListenForGroupUpdates()
    }, [getGroup, listenForGroupUpdates, returnListenForGroupUpdates]);


    // for join group 
    useEffect(() => {
        if (!socket || !selectedUser?._id) return;
        // Leave previous user chat if it exists
        if (previousGroupId && previousGroupId !== selectedUser._id) {
            socket.emit("leaveGroup", previousGroupId);
        }
        // Join the new user's chat room
        socket.emit("joinGroup", selectedUser._id);

        // Update previous group ID
        setPreviousGroupId(selectedUser._id);
    }, [selectedUser, socket, previousGroupId]);

    // handleSearch
    const handleSearch = async (email) => {
        if (!email.trim()) {
            setSearchedUser([]);
            return;
        }
        const result = await searchUser(email);
        setSearchedUser(result || []);
    };


    const userGroups = groups.filter(group => group.members?.some(member => member._id === currentUser._id));
    const groupsWithUnread = userGroups.map(group => ({
        ...group,
        unreadCount: group.unreadCounts?.[currentUser._id] || 0
    }));


    // for all the users
    const allUser = [...acceptedContacts, ...pendingContacts].sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime))
    const filteredUsers = showOnlineOnly ? allUser.filter(user => onlineUsers.includes(user?._id)) : allUser;
    const currentOnlineUser = allUser.filter(user => onlineUsers.includes(user?._id));
    console.log(groupsWithUnread);
    console.log(acceptedContacts);


    if (isUsersLoading) return <SidebarSkeleton />
    return (
        <aside className='h-full w-20 lg:w-64 border-r border-base-300 flex flex-col transition-all duration-200' >
            {/* filter online users */}
            <button className={`w-full flex gap-3 items-center p-5 py-[12px] lg:py-[10px] border-b border-base-300 cursor-pointer `} onClick={()=>setGroup(false)} >
                <div className="relative mx-auto lg:mx-0 ">
                    {/* avatar section */}
                    <img src={currentUser?.profilePic || "/avatar.png"}
                        className='size-10 object-cover rounded-full '
                        alt={currentUser.fullName} title={currentUser.fullName} />

                    {/* online user section */}
                    {onlineUsers.includes(currentUser._id) && (
                        <span className='size-3 rounded-full bg-green-500 absolute bottom-0 right-0
                                    ring-1 ring-zinc-900
                                '/>
                    )}
                </div>

                {/* user info Only visible on larger screen */}
                <div className="hidden  lg:block text-left min-w-0 ">
                    <p className='capitalize font-medium truncate ' >{currentUser.fullName || currentUser.name}</p>
                    <div className="text-zinc-400 text-sm">
                        <span>Set a status</span>
                    </div>
                </div>
            </button>

            <div className="w-full py-3 overflow-y-auto  ">
                <div className=" items-center mb-2 border border-base-300 rounded p-2 justify-between gap-2 hidden lg:flex" >
                    <div onClick={() => setShowSearch(true)} className='flex gap-2 items-center' >
                        <div >
                            <Search size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder='Search by email...'
                            value={searchEmail}
                            onClick={() => setShowSearch(false)}
                            onChange={(e) => {
                                setSearchEmail(e.target.value);
                                handleSearch(e.target.value);
                            }}
                            className='w-full focus:outline-none flex-1'
                        />
                    </div>
                    <button className={` ${showSearch ? "block" : "hidden"} cursor-pointer `} onClick={() => {
                        setShowSearch(false)
                        setSearchEmail("")
                    }
                    } >
                        <X />
                    </button>
                </div>
                {showSearch ? (
                    <>
                        {(searchedUser?.length > 0 ||
                            filteredUsers.some(user => user.fullName.toLowerCase().includes(searchEmail.toLowerCase()))) ? (
                            <div onClick={() => {
                                setShowSearch(false);
                                setSearchEmail("");
                            }}>
                                {searchedUser
                                    ?.filter(user => !filteredUsers.some(contact => contact._id === user._id))
                                    .map(user => (
                                        <UserDetails key={user._id} profilePic={user.profilePic} user={user} name={user.fullName} />
                                    ))}

                                {/* Show matching contacts */}
                                {filteredUsers
                                    ?.filter(user => user.fullName.toLowerCase().includes(searchEmail.toLowerCase()))
                                    .map(user => (
                                        <UserDetails key={user._id} profilePic={user?.profilePic} user={user} name={user?.fullName} />
                                    ))}
                            </div>
                        ) : (
                            <div className='text-center text-zinc-500 pt-2 ' >User not Here</div>
                        )}
                    </>
                ) :
                    (
                        <div>
                            {!group && (
                                <div className="tabs tabs-border  w-full ">
                                    <input type="radio" name="my_tabs_2" className="tab flex-1 " aria-label="Users" defaultChecked />
                                    <div className="tab-content">
                                        <div className="mt-3 hidden lg:flex items-center p-2 py-3 gap-2 border-b border-base-200  ">
                                            <label className='cursor-pointer flex items-center gap-2 '>
                                                <input type="checkbox" checked={showOnlineOnly}
                                                    onChange={(e) => setShowOnlineOnly(e.target.checked)}
                                                    className='checkbox checkbox-sm'
                                                />
                                                <span className='text-sm'>Show online only</span>
                                            </label>
                                            <span>({currentOnlineUser.length}online) </span>
                                        </div>
                                        {
                                            filteredUsers?.length > 0 && (
                                                <>
                                                    {filteredUsers?.map((user) => (
                                                        <div key={user._id}>
                                                            <UserDetails key={user?._id} profilePic={user?.profilePic || user.senderId?.profilePic} user={user?.senderId || user} name={user.senderId?.fullName || user?.fullName} lastMessage={user.lastMessage} lastMessageTime={user.lastMessageTime} />
                                                        </div>
                                                    ))}
                                                </>
                                            )
                                        }
                                    </div>
                                    <input type="radio" name="my_tabs_2" className="tab hidden lg:flex flex-1 " aria-label="Groups" />
                                    <div className="tab-content">
                                        <button className='w-full flex gap-2 justify-center py-3 border border-base-300 rounded-xl mt-3 mb-3 cursor-pointer ' onClick={() => setGroup(!group)} >
                                            Create new Group <SquarePlus />
                                        </button>
                                        {groupsWithUnread?.map((user) => (
                                            <UserDetails key={user._id} profilePic={user.profilePic} user={user} name={user.name} unreadCount={user.unreadCount} />
                                        ))}
                                    </div>
                                    <input type="radio" name="my_tabs_2" className="tab hidden lg:flex flex-1" aria-label="Contacts" />
                                    <div className="tab-content">
                                        <div className="px-3 text-lg mt-4 pb-2 border-b border-base-200">
                                            My contacts
                                        </div>
                                        {acceptedContacts?.map((user) => (
                                            <UserDetails key={user?._id} profilePic={user?.profilePic} user={user} name={user?.fullName} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                {group && (
                    <>
                        <GroupChat setGroup={setGroup} />
                    </>
                )}
                {filteredUsers?.length === 0 && (
                    <div className='text-center text-zinc-500 py-3'>No Online users</div>
                )}
            </div>
        </aside >
    )
}

export default Sidebar