import React from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";
import { motion } from 'framer-motion';
import { Sparkles, ShieldCheck } from 'lucide-react';

export const Login = () => {
    const { instance } = useMsal();

    const handleLogin = () => {
        instance.loginRedirect(loginRequest).catch(e => {
            console.error(e);
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 overflow-hidden relative">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-purple-500/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-cyan-500/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="glass p-12 rounded-3xl shadow-2xl max-w-md w-full mx-4 relative z-10 border border-white/10 backdrop-blur-xl"
            >
                <div className="text-center mb-10">
                    <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 mb-6 shadow-inner border border-white/10">
                        <Sparkles className="w-12 h-12 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Welcome Back</h1>
                    <p className="text-gray-300 text-lg font-light">Sign in to access your DevOps Assistant</p>
                </div>

                <motion.button
                    whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(168, 85, 247, 0.4)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLogin}
                    className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-semibold text-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-3 group border border-white/10"
                >
                    <ShieldCheck className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span>Sign in with Microsoft</span>
                </motion.button>

                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Secure Enterprise Access</p>
                </div>
            </motion.div>
        </div>
    );
};
