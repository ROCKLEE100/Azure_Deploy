import React, { useState, useRef, useEffect } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}


function FormattedMessage({ content, isUser }) {
    if (isUser) return <div className="relative z-10 font-medium">{content}</div>;


    const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/);

    return (
        <div className="relative z-10 space-y-2">
            {parts.map((part, idx) => {

                if (part.startsWith('```') && part.endsWith('```')) {
                    const code = part.slice(3, -3).trim();
                    const lines = code.split('\n');
                    const language = lines[0].match(/^[a-z]+$/) ? lines.shift() : '';

                    return (
                        <pre key={idx} className="bg-gray-800 text-gray-100 rounded-lg p-4 overflow-x-auto my-3 shadow-inner">
                            {language && <div className="text-xs text-gray-400 mb-2 font-semibold uppercase">{language}</div>}
                            <code className="text-sm font-mono leading-relaxed">{lines.join('\n')}</code>
                        </pre>
                    );
                }


                if (part.startsWith('`') && part.endsWith('`')) {
                    return (
                        <code key={idx} className="bg-gray-800 text-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {part.slice(1, -1)}
                        </code>
                    );
                }


                return (
                    <div key={idx} className="leading-relaxed">
                        {part.split('\n').map((line, lineIdx) => {
                            if (!line.trim()) return <div key={lineIdx} className="h-2" />;


                            let formatted = line.split(/(\*\*.*?\*\*)/).map((segment, segIdx) => {
                                if (segment.startsWith('**') && segment.endsWith('**')) {
                                    return <strong key={segIdx} className="font-bold text-gray-950">{segment.slice(2, -2)}</strong>;
                                }
                                return segment;
                            });


                            if (line.trim().match(/^[-*•]\s/)) {
                                return (
                                    <div key={lineIdx} className="flex gap-2 ml-2">
                                        <span className="text-purple-600 font-bold">•</span>
                                        <span className="flex-1">{formatted}</span>
                                    </div>
                                );
                            }


                            if (line.trim().match(/^\d+\.\s/)) {
                                return (
                                    <div key={lineIdx} className="flex gap-2 ml-2">
                                        <span className="text-purple-600 font-bold">{line.match(/^\d+\./)[0]}</span>
                                        <span className="flex-1">{formatted}</span>
                                    </div>
                                );
                            }

                            return <div key={lineIdx}>{formatted}</div>;
                        })}
                    </div>
                );
            })}
        </div>
    );
}

export default function Chat() {

    const sessionId = useRef(`user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    const { instance, accounts } = useMsal();

    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! I am your DevOps Assistant. How can I help you optimize your infrastructure today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';

            // Acquire token silently
            const account = accounts[0];
            const responseToken = await instance.acquireTokenSilent({
                ...loginRequest,
                account: account
            });

            const response = await fetch(`${apiUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${responseToken.accessToken}`
                },
                body: JSON.stringify({ message: userMessage, session_id: sessionId.current }),
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantMessage = '';

            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                assistantMessage += chunk;

                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content = assistantMessage;
                    return newMessages;
                });
            }
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error processing your request.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen max-w-5xl mx-auto p-6">

            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 py-6 mb-6"
            >
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 rounded-2xl blur-xl opacity-80 animate-pulse"></div>
                    <div className="relative p-3 bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 rounded-2xl shadow-2xl">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                </div>
                <div className="flex-1">
                    <h1 className="text-4xl font-bold gradient-text mb-1">
                        DevOps Assistant
                    </h1>
                    <p className="text-sm text-gray-800 font-semibold">Powered by LangChain & Groq ✨</p>
                </div>
                <div className="glass px-5 py-2 rounded-full shadow-lg">
                    <span className="text-sm text-emerald-700 font-bold">● Online</span>
                </div>
            </motion.header>


            <div className="flex-1 overflow-y-auto space-y-6 pr-2 mb-6">
                <AnimatePresence initial={false}>
                    {messages.map((msg, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className={cn(
                                "flex gap-4 max-w-[85%]",
                                msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                            )}
                        >

                            <div className={cn(
                                "shrink-0 w-12 h-12 rounded-full flex items-center justify-center relative shadow-lg",
                                msg.role === 'user'
                                    ? "bg-gradient-to-br from-cyan-400 to-blue-500"
                                    : "bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400"
                            )}>
                                <div className={cn(
                                    "absolute inset-0 rounded-full blur-lg opacity-70 animate-pulse",
                                    msg.role === 'user'
                                        ? "bg-gradient-to-br from-cyan-400 to-blue-500"
                                        : "bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400"
                                )}></div>
                                <div className="relative">
                                    {msg.role === 'user' ? <User size={22} className="text-white" /> : <Bot size={22} className="text-white" />}
                                </div>
                            </div>


                            <motion.div
                                whileHover={{ scale: 1.02, y: -2 }}
                                className={cn(
                                    "px-6 py-4 rounded-2xl text-sm shadow-xl relative overflow-hidden",
                                    msg.role === 'user'
                                        ? "bg-gradient-to-br from-cyan-400 to-blue-500 text-white rounded-tr-none font-medium leading-relaxed"
                                        : "glass text-gray-900 rounded-tl-none border-l-4 border-purple-400 leading-loose"
                                )}
                            >
                                {msg.role === 'assistant' && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-200/30 via-pink-200/30 to-cyan-200/30 pointer-events-none"></div>
                                )}
                                <FormattedMessage content={msg.content} isUser={msg.role === 'user'} />
                            </motion.div>
                        </motion.div>
                    ))}
                </AnimatePresence>


                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-4 mr-auto"
                    >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 flex items-center justify-center relative shadow-lg">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 blur-lg opacity-70 animate-pulse"></div>
                            <Bot size={22} className="text-white relative z-10" />
                        </div>
                        <div className="glass px-6 py-4 rounded-2xl rounded-tl-none border-l-4 border-purple-400 flex items-center gap-3 shadow-lg">
                            <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                            <span className="text-sm text-gray-800 font-semibold">Thinking...</span>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>


            <motion.form
                onSubmit={handleSubmit}
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <div className="glass rounded-2xl p-1.5 shadow-2xl border-2 border-white/40">
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about Kubernetes, Docker, CI/CD..."
                            className="flex-1 bg-transparent px-6 py-4 text-gray-900 font-medium focus:outline-none placeholder:text-gray-600/80 placeholder:font-normal"
                            disabled={isLoading}
                        />
                        <motion.button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-4 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 hover:from-purple-600 hover:via-pink-600 hover:to-cyan-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-30 transition-opacity"></div>
                            <Send size={22} className="relative z-10" />
                        </motion.button>
                    </div>
                </div>

                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 rounded-2xl blur-2xl opacity-40"></div>
            </motion.form>
        </div>
    );
}
