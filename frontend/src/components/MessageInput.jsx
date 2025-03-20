import { ChevronDown, CircleX, File, Image, Send, ShieldClose, Smile, X } from 'lucide-react';
import React, { useRef, useState } from 'react'
import toast from 'react-hot-toast';
import { useChatStore } from '../store/useChatStore';
import { useGroupStore } from '../store/useGroupStore';
import { formatMessageDay } from '../lib/Utils';
import renderFile from '../lib/file';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
const MessageInput = ({ replyMsg, setReplyMsg }) => {
    const [text, setText] = useState("");
    const [imagePreview, setImagePreview] = useState(null)
    const fileInputRef = useRef(null);
    const { sendMessage, selectedUser } = useChatStore();
    const { sendGroupMessage } = useGroupStore();
    const fileRef = useRef(null);
    const [file, setFile] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);


    // get the image
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        }
        reader.readAsDataURL(file);
    }

    // handle file send
    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        if (selectedFile.size > MAX_FILE_SIZE) {
            toast.error("File size exceeds 10MB limit.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setFile({
                name: selectedFile.name,
                type: selectedFile.type,
                size: selectedFile.size,
                data: reader.result
            });
        };
        reader.readAsDataURL(selectedFile);
    }
    // remove the image
    const removeImage = () => {
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    // add emoji
    const addEmoji = (emoji) => {
        setText((prevText) => prevText + emoji.native);
    };

    // send the message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!text.trim() && !imagePreview && !file) return;
        try {

            const messageData = {
                text: text.trim(),
                image: imagePreview,
                file: file,
                groupId: selectedUser._id,
                groupName: selectedUser?.name,
            };

            if (replyMsg) {
                messageData.replyMsg = replyMsg._id;
            }
            if (selectedUser?.members) {
                await sendGroupMessage(messageData);
            } else {
                await sendMessage(messageData);
            }

            // clear form
            setReplyMsg(null)
            setText("");
            setImagePreview(null);
            setFile(null);
            setShowEmojiPicker(false)
            if (fileInputRef.current) fileInputRef.current.value = "";
            if (fileRef) fileRef.current.value = "";
        } catch (error) {
            console.log("Failed to send message:", error);
        }
    }

    return (
        // show image preview 
        <div className='p-4 px-5 w-full '>
            {imagePreview && (
                <div className="mb-3 flex items-center gap-2 ">
                    <div className="relative">
                        <img src={imagePreview}
                            className='w-20 h-20 object-cover rounded-lg border border-zinc-700 '
                            alt="image preview" />
                        <button onClick={removeImage} className='absolute -top-1.5 size-5 -right-1.5
                                rounded-full bg-base-300 flex items-center justify-center cursor-pointer
                            ' type='button' >
                            <X size={10} />
                        </button>
                    </div>
                </div>
            )}
            <form onSubmit={handleSendMessage} className='flex items-center gap-2' >
                <div className={`flex-1 flex gap-2 relative `} >
                    {replyMsg &&
                        <div className='absolute flex justify-between p-3 space-y-1 shadow-2xl bottom-10 left-0 bg-base-300  rounded-md w-3/4 text-primary-content  ' >
                            <div>
                                <div className='text-lg' >{replyMsg.text || replyMsg.message}</div>
                                {replyMsg.file && <div className='py-2' >{renderFile(replyMsg.file)}</div>}
                                <div >{replyMsg.image && <img src={replyMsg.image} alt="image" className='h-14 w-14 object-cover ' />} </div>
                                <div className='text-sm' >{replyMsg.senderId.fullName}, <span className='text-[12px]' >{formatMessageDay(replyMsg.createdAt)}</span> </div>
                            </div>
                            <div>
                                <CircleX className='cursor-pointer' onClick={() => setReplyMsg(null)} />
                            </div>
                        </div>}

                    {showEmojiPicker && (
                        <div
                            className="absolute bottom-12 left-0 z-50"
                            tabIndex={0} // Make it focusable
                            onBlur={() => setShowEmojiPicker(false)} // Hide when losing focus
                        >
                            <Picker data={data} onEmojiSelect={addEmoji} theme="light" />
                        </div>
                    )}
                    <div className="relative flex-1">
                        <input
                            type="text"
                            className="w-full input input-bordered focus:outline-none rounded-lg bg-base-200 input-sm sm:input-md m-0 pl-10"
                            placeholder="Type a message..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />

                        {/* Emoji Icon */}
                        <div className='absolute left-2 swap-on top-[10px] text-gray-400 z-10' >
                            {showEmojiPicker ?
                                <button type="button" data-tip="close expression picker" className='tooltip' onClick={() => setShowEmojiPicker((prev) => !prev)} >
                                    <ChevronDown size={22} />
                                </button>
                                :
                                <button type="button" data-tip="Open expression picker" className='tooltip' onClick={() => setShowEmojiPicker((prev) => !prev)} >
                                    <Smile size={22} />
                                </button>
                            }
                        </div>
                    </div>

                    <input type="file"
                        accept='image/*'
                        className='hidden'
                        ref={fileInputRef}
                        onChange={handleImageChange}
                    />

                    <input type="file"
                        className='hidden'
                        ref={fileRef}
                        onChange={handleFileChange}
                    />
                    <button type='button' data-tip="Send Image" className={`hidden sm:flex btn btn-circle tooltip
                    ${imagePreview ? "text-emerald-500" : "text-zinc-400"} `}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Image size={20} />
                    </button>
                    <button type='button' data-tip="Send File" className={`hidden sm:flex btn btn-circle tooltip
                    ${file ? "text-emerald-500" : "text-zinc-400"} `}
                        onClick={() => fileRef.current?.click()}
                    >
                        <File size={20} />
                    </button>
                </div>
                <button type='submit' data-tip="Send Message" className='btn btn-sm sm:btn-md  btn-circle tooltip tooltip-left' disabled={!text.trim() && !imagePreview && !file}  >
                    <Send size={22} />
                </button>
                {/* </div> */}
            </form>
        </div>
    )
}

export default MessageInput