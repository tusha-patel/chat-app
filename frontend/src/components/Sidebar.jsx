import React, { useEffect, useState } from 'react'
import { useChatStore } from '../store/useChatStore'
import SidebarSkeleton from './skeleton/SidebarSkeleton';
import { Search, SquarePlus, Users } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import GroupChat from './GroupChat';
import { useGroupStore } from '../store/useGroupStore';
import UserDetails from './UserDetails';
// import toast from 'react-hot-toast';

const Sidebar = () => {
    // fetch useChatStore;
    const { getUsers, users, selectedUser, isUsersLoading } = useChatStore();
    // find the online user;
    const { onlineUsers, authUser: currentUser, socket, searchUser } = useAuthStore();
    const [showOnlineOnly, setShowOnlineOnly] = useState(false);
    const [group, setGroup] = useState(false);
    const { getGroup, groups, listenForGroupUpdates } = useGroupStore();
    const [previousGroupId, setPreviousGroupId] = useState(null);
    const [searchEmail, setSearchEmail] = useState("");
    const [searchedUser, setSearchedUser] = useState(null);
    // console.log(searchedUser);

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
        if (!socket || !selectedUser?._id) return;

        // Leave previous group if it exists and is different from the current one
        if (previousGroupId && previousGroupId !== selectedUser._id) {
            socket.emit("leaveGroup", previousGroupId);
        }

        // Join the new group
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

    const acceptedContacts = users.filter(user => {
        return user?.contacts?.some(contact =>
            contact.userId._id === currentUser._id && contact.status === "accepted"
        );
    });

    const filteredUsers = showOnlineOnly ? acceptedContacts.filter(user => onlineUsers.includes(user._id)) : acceptedContacts;

    // const filteredUsers = showOnlineOnly ? users.filter((user) => onlineUsers.includes(user._id)) : users;
    const userGroups = groups.filter(group => group.members.some(member => member._id === currentUser._id));

    if (isUsersLoading) return <SidebarSkeleton />
    return (
        <aside className='h-full w-20 lg:w-64 border-r border-base-300 flex flex-col transition-all duration-200' >
            {/* filter online users */}
            <button className={`w-full flex gap-3 items-center p-5 py-[12px] lg:py-[10px] border-b border-base-300 `} >
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
                <div className=" hidden lg:block text-left min-w-0 ">
                    <p className='capitalize font-medium truncate ' >{currentUser.fullName || currentUser.name}</p>
                    <div className="text-zinc-400 text-sm">
                        <span>Set a status</span>
                    </div>
                </div>
            </button>

            {/* set all  users */}
            <div className="w-full py-3 overflow-y-auto ">
                {!group && (
                    <div className="tabs tabs-border  w-full ">
                        <input type="radio" name="my_tabs_2" className="tab" aria-label="Users" defaultChecked />
                        <div className="tab-content">
                            <div className="mt-3 hidden lg:flex items-center p-2 py-3 gap-2 border-b border-base-200  ">
                                <label className='cursor-pointer flex items-center gap-2 '>
                                    <input type="checkbox" checked={showOnlineOnly}
                                        onChange={(e) => setShowOnlineOnly(e.target.checked)}
                                        className='checkbox checkbox-sm'
                                    />
                                    <span className='text-sm'>Show online only</span>
                                </label>
                                <span>({onlineUsers.length - 1}online) </span>
                            </div>
                            {filteredUsers?.map((user) => (
                                <UserDetails key={user._id} profilePic={user.profilePic} user={user} name={user.fullName} />
                            ))}
                        </div>

                        <input type="radio" name="my_tabs_2" className="tab" aria-label="Groups" />
                        <div className="tab-content">
                            <button className='w-full flex gap-2 justify-center py-3 border border-base-300 rounded-xl mt-3 ' onClick={() => setGroup(!group)} >
                                Create new Group<SquarePlus />
                            </button>
                            {userGroups?.map((user) => (
                                <UserDetails key={user._id} profilePic={user.profilePic} user={user} name={user.name} />
                            ))}
                        </div>
                        <input type="radio" name="my_tabs_2" className="tab" aria-label="Contacts" />
                        <div className="tab-content">
                            <div className="flex items-center  border border-white mt-3 rounded p-2 justify-between gap-2 ">
                                <div >
                                    <Search size={20} />
                                </div>
                                <input
                                    type="search"
                                    placeholder='Search by email...'
                                    value={searchEmail}
                                    onChange={(e) => {
                                        setSearchEmail(e.target.value); // Update the searchEmail state
                                        handleSearch(e.target.value); // Trigger the debounced search
                                    }}
                                    className='w-full focus:outline-none flex-1'
                                />
                            </div>
                            {/* Display searched user (Contacts Tab) */}
                            {searchedUser && (
                                searchedUser?.map((user) => (
                                    <div className="mt-3" key={user._id} >
                                        <UserDetails key={user._id} profilePic={user.profilePic} user={user} name={user.fullName} />
                                    </div>
                                ))
                            )}
                            {filteredUsers?.map((user) => (
                                <div className='mt-3' key={user._id} >
                                    <div className="">
                                        My contacts
                                    </div>
                                    <UserDetails _id={user._id} profilePic={user.profilePic} user={user} name={user.fullName} />
                                </div>
                            ))}
                        </div>
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























{/* <div className="border-b border-base-300 w-full p-5 ">
                <div className="flex items-center gap-2 ">
                    <div className="flex">
                        <Users className='size-6' />
                        <span className='font-medium hidden lg:block '>Contacts</span>
                    </div>
                    <div className="cursor-pointer" onClick={() => setGroup(!group)} >
                        <SquarePlus />
                    </div>
                </div>
                // filter toggle
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
            </div> */}