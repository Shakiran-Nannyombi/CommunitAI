"use client";

import { useEffect, useRef, useState } from "react";
import { plannerChat, clearPlannerChat, loadAuth, type PlannerMessageOut } from "@/lib/api";
import { 
    Send, Trash2, Bot, User, Loader2, Sparkles, 
    MessageSquare, AlertCircle, Info, Trash
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
    workspaceId: string;
}

export default function PlannerTab({ workspaceId }: Props) {
    const [messages, setMessages] = useState<PlannerMessageOut[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [clearing, setClearing] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const userId = loadAuth()?.user_id ?? "";

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    async function handleSend(e: React.FormEvent) {
        e.preventDefault();
        const text = input.trim();
        if (!text || loading) return;

        // Optimistic update for user message
        const userMsg: PlannerMessageOut = { 
            role: "user", 
            content: text,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);
        setError("");

        try {
            const res = await plannerChat(workspaceId, text, userId);
            setMessages(res.history);
        } catch {
            setError("The Planner Agent is currently unavailable.");
            // Remove the optimistic message if it failed? No, keep it but show error
        } finally {
            setLoading(false);
        }
    }

    async function handleClear() {
        if (!confirm("Are you sure you want to clear the conversation?")) return;
        setClearing(true);
        setError("");
        try {
            await clearPlannerChat(workspaceId, userId);
            setMessages([]);
        } catch {
            setError("Failed to reset the agent memory.");
        } finally {
            setClearing(false);
        }
    }

    return (
        <div className="flex flex-col h-[800px] glass-card rounded-4xl overflow-hidden shadow-2xl relative group">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-accent/1 pointer-events-none group-hover:bg-accent/2 transition-colors duration-700"></div>

            {/* Chat Header */}
            <header className="shrink-0 px-10 py-8 border-b border-text/5 bg-background/50 backdrop-blur-xl flex items-center justify-between relative z-10">
                <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center text-accent shadow-xl shadow-accent/5">
                        <Bot className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-text tracking-tight uppercase">Planner Agent</h3>
                        <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em] flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                            AI Insight Ready
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleClear}
                    disabled={clearing || messages.length === 0}
                    className="p-2.5 text-text/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-0"
                    title="Clear Conversation"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </header>

            {/* Chat Content */}
            <div className="flex-1 overflow-y-auto px-10 py-10 space-y-10 custom-scrollbar relative z-10">
                <AnimatePresence initial={false}>
                    {messages.length === 0 && !loading && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center py-20 text-center space-y-4"
                        >
                            <div className="w-16 h-16 bg-text/5 rounded-full flex items-center justify-center text-text/10">
                                <MessageSquare className="w-8 h-8" />
                            </div>
                            <div className="max-w-xs">
                                <h4 className="text-sm font-black text-text">Strategic Partner</h4>
                                <p className="text-xs font-medium text-text/40 mt-1">Ask anything about community trends, task blockers, or future planning.</p>
                            </div>
                        </motion.div>
                    )}

                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-sm ${
                                    msg.role === "user" ? "bg-text text-background" : "bg-accent/10 text-accent border border-accent/20"
                                }`}>
                                    {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                </div>
                                <div className={`relative px-5 py-4 rounded-3xl text-sm font-medium leading-relaxed ${
                                    msg.role === "user"
                                        ? "bg-text text-background rounded-tr-none shadow-xl shadow-text/5"
                                        : "bg-text/5 text-text rounded-tl-none border border-text/5"
                                }`}>
                                    {msg.content}
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {loading && (
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex justify-start"
                        >
                            <div className="flex gap-3">
                                <div className="shrink-0 w-8 h-8 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center text-accent">
                                    <Bot className="w-4 h-4" />
                                </div>
                                <div className="bg-text/5 border border-text/5 rounded-3xl rounded-tl-none px-5 py-4 flex items-center gap-3">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-accent/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <div className="w-1.5 h-1.5 bg-accent/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <div className="w-1.5 h-1.5 bg-accent/40 rounded-full animate-bounce" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-accent/60 tracking-widest">Thinking</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex justify-center"
                        >
                            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {error}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div ref={bottomRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSend} className="shrink-0 p-10 border-t border-text/5 bg-background/50 backdrop-blur-xl relative z-10">
                <div className="relative flex items-center gap-3">
                    <div className="relative flex-1 group">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Type a strategic question..."
                            disabled={loading}
                            className="w-full bg-text/3 border border-text/5 rounded-2xl pl-5 pr-12 py-4 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-accent/5 focus:border-accent/40 transition-all placeholder:text-text/20"
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-text text-background rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-0 disabled:scale-95"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <p className="text-[9px] font-bold text-text/20 uppercase tracking-[0.2em] mt-3 text-center flex items-center justify-center gap-2">
                    <Sparkles className="w-3 h-3" />
                    CommunitAI Planner v2.0
                </p>
            </form>
        </div>
    );
}
