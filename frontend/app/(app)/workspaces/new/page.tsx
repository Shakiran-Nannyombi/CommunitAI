"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createWorkspace, loadAuth, getWorkspaces } from "@/lib/api";
import { 
    Plus, ChevronLeft, Sparkles, 
    Hash, Globe, Users, Zap,
    Loader2, CheckCircle2, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EMOJI_OPTIONS = ["🏘️", "🏢", "🏘️", "🏠", "🚀", "💡", "🎮", "🌟", "🔥", "🌈", "🧩", "💼"];

export default function NewWorkspace() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [emoji, setEmoji] = useState("🏘️");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const userId = loadAuth()?.user_id ?? "";

    useEffect(() => {
        if (!loadAuth()) router.replace("/login");
    }, [router]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || loading) return;

        setLoading(true);
        setError("");
        try {
            const ws = await createWorkspace(name.trim(), emoji, userId);
            setSuccess(true);
            setTimeout(() => {
                router.push(`/workspaces/${ws.id}`);
            }, 1000);
        } catch (err) {
            setError("Something went wrong. Please try another name.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-background px-6">
            <div className="w-full max-w-xl space-y-12">
                {/* Back Link */}
                <button 
                    onClick={() => router.back()}
                    className="group flex items-center gap-2 text-text/40 hover:text-text transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Dashbboard</span>
                </button>

                <div className="space-y-4">
                    <h1 className="text-5xl font-black text-text tracking-tighter">Forge a New Space</h1>
                    <p className="text-xl text-text/40 font-medium">Create a dedicated environment for your community context.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-10">
                    <div className="space-y-8">
                        {/* Emoji Selection */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-text/30 ml-1">Workspace Symbol</label>
                            <div className="flex flex-wrap gap-4">
                                {EMOJI_OPTIONS.map(em => (
                                    <button
                                        key={em}
                                        type="button"
                                        onClick={() => setEmoji(em)}
                                        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all ${
                                            emoji === em 
                                                ? 'bg-accent text-background scale-110 shadow-xl shadow-accent/20 ring-4 ring-accent/10' 
                                                : 'bg-text/5 text-text/40 hover:bg-text/10'
                                        }`}
                                    >
                                        {em}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Name Input */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-text/30 ml-1">Workspace Identity</label>
                            <div className="relative group">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-text/20 group-focus-within:text-accent transition-colors">
                                    <Hash className="w-6 h-6" />
                                </div>
                                <input 
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. engineering-hq"
                                    required
                                    className="w-full bg-text/3 border border-text/10 rounded-[2.5rem] pl-16 pr-8 py-8 text-2xl font-black text-text placeholder:text-text/10 focus:outline-none focus:ring-8 focus:ring-accent/5 focus:border-accent/40 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading || !name.trim() || success}
                            className={`w-full py-8 rounded-[2.5rem] font-black text-lg uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-4 ${
                                success 
                                    ? 'bg-accent text-background shadow-accent/20' 
                                    : 'bg-text text-background shadow-text/10 hover:scale-[1.02] active:scale-95'
                            }`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    Synchronizing...
                                </>
                            ) : success ? (
                                <>
                                    <CheckCircle2 className="w-6 h-6" />
                                    Space Ready
                                </>
                            ) : (
                                <>
                                    <Plus className="w-6 h-6" />
                                    Initialize Workspace
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Footer Perks */}
                <div className="grid grid-cols-3 gap-6 pt-12">
                    {[
                        { icon: Globe, label: "Private Subnet" },
                        { icon: Users, label: "Multi-Agent" },
                        { icon: Zap, label: "Fast Intel" },
                    ].map((perk, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 opacity-20 hover:opacity-100 transition-opacity">
                            <perk.icon className="w-5 h-5 text-text" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{perk.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
