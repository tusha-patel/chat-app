import { Image, Send, X } from 'lucide-react';
import React, { useRef, useState } from 'react'
import toast from 'react-hot-toast';
import { useChatStore } from '../store/useChatStore';

const MessageInput = () => {

    const [text, setText] = useState("");
    const [imagePreview, setImagePreview] = useState(null)
    const fileInputRef = useRef(null);
    const { sendMessage } = useChatStore();

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

    // remove the image
    const removeImage = () => {
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    // send the message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!text.trim() && !imagePreview) return;
        try {
            await sendMessage({
                text: text.trim(),
                image: imagePreview
            });

            // clear form
            setText("");
            setImagePreview(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (error) {
            console.log("Failed to send message:", error);
        }
    }

    return (
        // show image preview 
        <div className='p-4 w-full '>
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
                <div className="flex-1 flex gap-2  ">
                    <input type="text"
                        className='w-full input input-bordered focus:outline-none rounded-lg input-sm sm:input-md  '
                        placeholder='Type a message...'
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                    <input type="file"
                        accept='image/*'
                        className='hidden'
                        ref={fileInputRef}
                        onChange={handleImageChange}
                    />

                    <button type='button' className={`hidden sm:flex btn btn-circle
                    ${imagePreview ? "text-emerald-500" : "text-zinc-400"} `}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Image size={20} />
                    </button>
                </div>
                <button type='submit' className='btn btn-sm sm:btn-md  btn-circle' disabled={!text.trim() && !imagePreview}  >
                    <Send size={22} />
                </button>
            </form>
        </div>
    )
}

export default MessageInput