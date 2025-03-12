import { MessageSquare } from 'lucide-react'
import React from 'react'

const NoChatSelected = () => {
    return (
        <div className='flex flex-col group items-center justify-center w-full p-16 bg-base-100/50 '>
            <div className="max-w-md text-center space-y-3 ">
                {/* Icon display */}
                <div className="flex justify-center  mb-4 ">
                    <div className="relative">
                        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex justify-center items-center animate-bounce ">
                            <MessageSquare className='size-8 text-primary ' />
                        </div>
                    </div>
                </div>

                {/* Welcome text */}
                <h2 className='text-2xl font-bold mt-2' >Welcome to chatty !</h2>
                <p className='text-base-content/60'>Select a conversation from the sidebar to start chatting </p>

            </div>
        </div>
    )
}

export default NoChatSelected