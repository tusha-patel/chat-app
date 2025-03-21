import React from 'react'
import { useChatStore } from '../store/useChatStore'
import Sidebar from '../components/Sidebar';
import NoChatSelected from '../components/NoChatSelected';
import ChatContainer from '../components/ChatContainer';

const HomePage = () => {
    const { selectedUser } = useChatStore();
    return (
        <div className='h-screen bg-base-200 ' >
            <div className="flex items-center justify-center pt-20 px-4 ">
                <div className="bg-base-100 rounded-lg shadow-xl w-full container mx-auto h-[calc(100vh-8rem)]   ">
                    <div className="flex w-full h-full rounded-lg overflow-hidden  ">
                        <div><Sidebar /></div>
                        {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default HomePage