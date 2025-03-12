import React from 'react'
import { useThemeStore } from '../store/useThemeStore'
import { THEMES } from '../constants';
import { Send } from 'lucide-react';


const PREVIEW_MESSAGE = [
    { id: 1, content: "Hey ! how 's it going ?", isSent: false },
    { id: 2, content: "I am grate ! just working on some new features. ", isSent: true }
]

const SettingsPage = () => {

    const { theme, setTheme } = useThemeStore();

    return (
        <div className='h-screen container mx-auto px-4 pt-20 max-w-5xl  '>
            <div className="space-y-6">
                <div className="flex flex-col gap-1  ">
                    <h2 className='text-lg font-semibold'>Theme</h2>
                    <p className='text-sm text-base-content/70 '>Choose a theme for your chat interface</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {THEMES?.map((t) => (
                        <button key={t} className={`group flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors
                        ${theme === t ? "bg-base-200" : "hover:bg-base-200/50"}
                        `} onClick={() => setTheme(t)} >
                            <div className="relative h-10 w-full rounded-md overflow-hidden cursor-pointer " data-theme={t}>
                                <div className="absolute inset-0 grid grid-cols-4 gap-px p-2  ">
                                    <div className='rounded bg-primary'></div>
                                    <div className='rounded bg-secondary'></div>
                                    <div className='rounded bg-accent'></div>
                                    <div className='rounded bg-neutral'></div>
                                </div>
                            </div>
                            <span className='text-[11px] font-medium truncate w-full text-center ' >
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
            {/* preview section */}
            <div className="my-4 ">
                <h2 className='mb-3 font-semibold capitalize text-lg '>Preview</h2>
                <div className="bg-base-300 rounded-lg py-5 px-3 border border-base-300 overflow-hidden shadow-lg  ">
                    <div className="bg-base-200 rounded-lg max-w-lg mx-auto ">
                        {/* chat header */}
                        <div className="px-4 py-3  border-b border-base-300 pb-3 ">
                            <div className="flex items-center gap-3">
                                <span className='h-8 w-8 rounded-full flex justify-center
                            items-center bg-primary text-primary-content font-medium ' >J</span>
                                <div className="">
                                    <p className='font-medium text-sm'>jone doe </p>
                                    <span className='text-xs text-base-content/78'>Online</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* chat-message */}
                        <div className="p-4 space-y-4 min-h-[200px] max-h-[200px] overflow-y-auto bg-base-100 ">
                            {PREVIEW_MESSAGE?.map((message) => (
                                <div key={message.id} className={`flex ${message.isSent ? "justify-end" : "justify-start"} `} >
                                    <div className={`max-w-[80%] rounded-xl p-3 shadow-sm 
                                        ${message.isSent ? "bg-primary text-primary-content " : "bg-base-200"}
                                        `}>
                                        <p className='text-sm'>{message.content}</p>
                                        <p className={` text-[10px] mt-1.5 ${message.isSent ? "text-primary-content/78" : "text-base-content/78"} `}>
                                            12:00 pm
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* chat input */}
                        <div className="p-4 border-t border-base-300 bg-base-100 rounded-b-lg ">
                            <div className="flex gap-2 ">
                                <input type="text"
                                    className='input input-bordered flex-1 text-sm h-10 focus:outline-none focus:border-base-300 focus:shadow-none '
                                    placeholder='Type a message...'
                                    value="This is a preview "
                                    readOnly />
                                <button className='btn btn-primary h-10 min-h-0 ' >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SettingsPage