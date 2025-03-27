import React, { useEffect, useState } from 'react'
import { useAuthStore } from '../store/useAuthStore';
import { useGroupStore } from '../store/useGroupStore';

const sidebar = () => {
    const { getUsers, users, selectedUser, isUsersLoading, pendingRequests, newContactRequest
    } = useChatStore();
    // find the online user;
    const { onlineUsers, authUser: currentUser, socket, searchUser } = useAuthStore();
    const [showOnlineOnly, setShowOnlineOnly] = useState(false);
    const [group, setGroup] = useState(false);
    const { getGroup, groups, listenForGroupUpdates } = useGroupStore();
    const [previousGroupId, setPreviousGroupId] = useState(null);
    const [searchEmail, setSearchEmail] = useState("");
    const [searchedUser, setSearchedUser] = useState(null);
    const [showSearch, setShowSearch] = useState(false);


    useEffect(() => {
        getUsers();
        if (socket) {
            newContactRequest()
        }
    }, [getUsers, newContactRequest, socket]);

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
    console.log(pendingRequests);



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

    const pendingContacts = users.filter(user =>
        user.contacts?.some(contact =>
            contact.userId._id === currentUser._id && contact.status === "pending"
        )

    );
    // console.log(pendingContacts);


    const filteredUsers = showOnlineOnly ? acceptedContacts.filter(user => onlineUsers.includes(user._id)) : acceptedContacts;

    // const filteredUsers = showOnlineOnly ? users.filter((user) => onlineUsers.includes(user._id)) : users;
    const userGroups = groups.filter(group => group.members.some(member => member._id === currentUser._id));


    return (
        <div>
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
                        {pendingContacts?.map((user) => (
                            <div key={user._id}>
                                <UserDetails key={user._id} profilePic={user.profilePic} user={user} name={user.fullName} />
                            </div>
                        ))}
                        {pendingRequests?.map((user) => (
                            <div key={user._id}>
                                <UserDetails key={user._id} profilePic={user?.senderId.profilePic} user={user.senderId} name={user.senderId?.fullName} />
                            </div>
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
                        {filteredUsers?.map((user) => (
                            <div className='mt-3' key={user._id} >
                                <div className="px-3 my-2 text-lg">
                                    My contacts
                                </div>
                                <UserDetails _id={user._id} profilePic={user.profilePic} user={user} name={user.fullName} />
                            </div>
                        ))}
                    </div>
                </div>
            )
            }
        </div>
    )
}

export default sidebar