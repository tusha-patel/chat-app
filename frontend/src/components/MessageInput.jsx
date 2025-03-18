import { File, Image, Send, X } from 'lucide-react';
import React, { useRef, useState } from 'react'
import toast from 'react-hot-toast';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { useGroupStore } from '../store/useGroupStore';

const MessageInput = () => {

    const [text, setText] = useState("");
    const [imagePreview, setImagePreview] = useState(null)
    const fileInputRef = useRef(null);
    const { sendMessage, selectedUser } = useChatStore();
    const { authUser } = useAuthStore();
    const { sendGroupMessage } = useGroupStore();
    const fileRef = useRef(null);
    const [file, setFile] = useState(null);


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
        // console.log(selectedFile);

        if (!selectedFile) return;
        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
        if (selectedFile.size > MAX_FILE_SIZE) {
            toast.error("File size exceeds 5MB limit.");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setFile({
                name: selectedFile.name,
                type: selectedFile.type, // Use file extension instead of MIME type
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

    // send the message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!text.trim() && !imagePreview && !file) return;
        try {

            const messageData = {
                text: text.trim(),
                image: imagePreview,
                file: file,
                groupId: selectedUser._id, // Make sure this is correct
                groupName: selectedUser?.name, // 👈 Add this if you're using group names   for rooms
                sender: authUser._id,
            };

            if (selectedUser?.members) {
                await sendGroupMessage(messageData);
            } else { // ✅ One-to-one chat
                await sendMessage(messageData);
            }


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

                    <input type="file"
                        className='hidden'
                        ref={fileRef}
                        onChange={handleFileChange}
                    />

                    <button type='button' className={`hidden sm:flex btn btn-circle
                    ${imagePreview ? "text-emerald-500" : "text-zinc-400"} `}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Image size={20} />
                    </button>
                    <button type='button' className={`hidden sm:flex btn btn-circle
                    ${file ? "text-emerald-500" : "text-zinc-400"} `}
                        onClick={() => fileRef.current?.click()}
                    >
                        <File size={20} />
                    </button>
                </div>
                <button type='submit' className='btn btn-sm sm:btn-md  btn-circle' disabled={!text.trim() && !imagePreview && !file}  >
                    <Send size={22} />
                </button>
            </form>
        </div>
    )
}

export default MessageInput