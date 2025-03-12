import React, { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore';
import { Eye, EyeOff, Loader2, Mail, MessageSquare, Lock } from 'lucide-react';
import AuthImagePattern from '../components/AuthImagePattern';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const LoginPage = () => {

    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });


    const { isLoggIng, login } = useAuthStore();

    const validateForm = () => {
        if (!formData.email.trim()) return toast.error("Email is required");
        if (!/\S+@\S+\.\S+/.test(formData.email)) return toast.error("Invalid email format");
        if (!formData.password) return toast.error("password is required");
        return true;
    }


    const handleSubmit = (e) => {
        e.preventDefault();
        const success = validateForm();

        if (success === true) login(formData);
    }


    return (
        <div className='min-h-screen grid lg:grid-cols-2 ' >
            {/* left side */}
            <div className="flex flex-col items-center justify-center p-6 sm:p-12 ">
                <div className="w-full max-w-md space-y-8 ">
                    {/* logo */}
                    <div className="flex flex-col items-center gap-2 group  ">
                        <div className='size-12 rounded-xl bg-primary/10 flex items-center
                            justify-center group-hover:bg-primary/20 transition-colors '>
                            <MessageSquare className='size-6 text-primary ' />
                        </div>
                        <h1 className='text-2xl font-bold mt-2 capitalize  '>Welcome back</h1>
                        <p className='text-base-content/60F' >Sign in to your account</p>
                    </div>

                    {/* form */}
                    <form onSubmit={handleSubmit} className='space-y-6' >
                        <div className="form-control">
                            <label className='label'>
                                <span className='label-text font-medium '>Email</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none pl-3 ">
                                    <Mail className='size-5 text-base-content/40 ' />
                                </div>
                                <input type="email" value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder='You@example.com' name='email' className='pl-10 p-2 border border-gray-500 rounded focus:outline-none w-full' />
                            </div>
                        </div>
                        <div className="form-control">
                            <label className='label'>
                                <span className='label-text font-medium '>Password</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex
                                    items-center pointer-events-none pl-3 ">
                                    <Lock className='size-5 text-base-content/40 ' />
                                </div>
                                <input type={showPassword ? "text" : "password"} placeholder='••••••••'
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    name='password' className='pl-10 p-2 border border-gray-500 rounded 
                                    focus:outline-none w-full' />
                                <button type='button' className='absolute cursor-pointer inset-y-0 right-0 pr-3 flex items-center ' onClick={() => setShowPassword(!showPassword)} >
                                    {showPassword ? (
                                        <EyeOff className='size-5 text-base-content/40' />
                                    ) : (
                                        <Eye className='size-5 text-base-content/40' />
                                    )}
                                </button>
                            </div>
                        </div>
                        <button type='submit' className='btn btn-primary w-full ' disabled={isLoggIng} >
                            {isLoggIng ? (
                                <>
                                    <Loader2 className='size-5 animate-spin' />
                                    Loading...
                                </>
                            ) :
                                (
                                    "Sign in"
                                )}
                        </button>
                        <div className="text-center">
                            <p className='text-base-content/60' >Don't have an account ?{" "}
                                <Link to="/signup" className='link link-primary' >Create account</Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>



            {/* right side */}
            <AuthImagePattern title="Join our community" subtitle="Connect with friend , share moments, and 
            stay in touch with your loved ones. " />

        </div>
    )
}

export default LoginPage