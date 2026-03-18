"use client";

import { useEffect, useRef, useState } from "react";
import { plannerChat, clearPlannerChat, loadAuth, type PlannerMessageOut } from "@/lib/api";

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

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    async function handleSend(e: React.FormEvent) {
        e.preventDefault();
        const text = input.trim();
        if (!text || loading) return;

        setLoading(true);
        setError("");
        try {
            const res = await plannerChat(workspaceId, text, userId);
            setMessages(res.history);
            setInput("");
        } catch {
            setError("Failed to get a response. Please try again.");
            // input is preserved (not cleared)
        } finally {
            setLoading(false);
        }
    }

    async function handleClear() {
        setClearing(true);
        setError("");
        try {
            await clearPlannerChat(workspaceId, userId);
            setMessages([]);
        } catch {
            setError("Failed to clear conversation.");
        } finally {
            setClearing(false);
        }
    }

    return (
        <div className="bg-zinc-950 border border-zinc-800 rounded flex flex-col" style={{ height: "60vh" }}>
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
                <span className="text-xs text-zinc-500 uppercase tracking-widest">Planner Agent</span>
                <button
                    onClick={handleClear}
                    disabled={clearing || messages.length === 0}
                    className="text-xs text-zinc-600 hover:text-red-400 transition disabled:opacity-40"
                >
                    {clearing ? "Clearing..." : "Clear conversation"}
                </button>
            </div>

            {/* Message list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 && !loading && (
                    <p className="text-xs text-zinc-700 text-center mt-8">
                        Ask the Planner Agent anything about your community.
                    </p>
                )}
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`max-w-[75%] rounded px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user"
                                    ? "bg-green-900/40 border border-green-800 text-green-100"
                                    : "bg-zinc-900 border border-zinc-700 text-zinc-300"
                                }`}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}

                {/* Loading spinner */}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-zinc-500">Thinking...</span>
                        </div>
                    </div>
                )}

                {/* Inline error */}
                {error && (
                    <div className="flex justify-center">
                        <span className="text-xs text-red-400 bg-red-900/20 border border-red-900 rounded px-3 py-1.5">
                            {error}
                        </span>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="flex-shrink-0 border-t border-zinc-800 px-4 py-3 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Ask the Planner Agent..."
                    disabled={loading}
                    className="flex-1 bg-black border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-green-700 transition disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="text-xs px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-black font-bold rounded transition"
                >
                    Send
                </button>
            </form>
        </div>
    );
}
