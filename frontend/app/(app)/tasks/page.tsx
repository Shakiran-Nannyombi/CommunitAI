"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    getGlobalTasks, completeActionItem, generateNudge, loadAuth,
    type GlobalActionItem
} from "@/lib/api";
import {
    CheckCircle2, Clock,
    MessageSquare, Sparkles,
    Loader2, Calendar, User, Zap, X, Copy, Check, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TasksPage() {
    const router = useRouter();
    const [tasks, setTasks] = useState<GlobalActionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "pending" | "completed">("pending");
    const [nudgeLoading, setNudgeLoading] = useState<string | null>(null);

    // Nudge modal
    const [nudgeMsg, setNudgeMsg] = useState("");
    const [nudgeCopied, setNudgeCopied] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ msg: string; type: "error" | "success" } | null>(null);

    const userId = loadAuth()?.user_id ?? "";

    const showToast = (msg: string, type: "error" | "success" = "error") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const loadData = useCallback(async () => {
        if (!userId) { router.replace("/login"); return; }
        try {
            const data = await getGlobalTasks(userId);
            setTasks(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [userId, router]);

    useEffect(() => { loadData(); }, [loadData]);

    async function handleToggle(task: GlobalActionItem) {
        try {
            await completeActionItem(task.id);
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
        } catch {
            showToast("Failed to update task status.");
        }
    }

    async function handleNudge(task: GlobalActionItem) {
        setNudgeLoading(task.id);
        try {
            const msg = await generateNudge(task.id);
            setNudgeMsg(msg);
        } catch {
            showToast("Nudge generation failed. Check your AI configuration.");
        } finally {
            setNudgeLoading(null);
        }
    }

    async function handleCopyNudge() {
        await navigator.clipboard.writeText(nudgeMsg);
        setNudgeCopied(true);
        setTimeout(() => setNudgeCopied(false), 2000);
    }

    const filteredTasks = tasks.filter(t => {
        if (filter === "pending") return !t.completed;
        if (filter === "completed") return t.completed;
        return true;
    });

    if (loading) return (
        <div className="flex-1 flex items-center justify-center bg-background">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
    );

    return (
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-accent/5 blur-[100px] rounded-full pointer-events-none" />

            {/* Header */}
            <header className="shrink-0 px-5 sm:px-10 lg:px-16 py-8 lg:py-16 bg-background/50 backdrop-blur-xl relative z-10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-12">
                    <div className="space-y-6">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-accent/10 border border-accent/20 rounded-3xl flex items-center justify-center text-accent shadow-2xl shadow-accent/5">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-text tracking-tighter">Team Tasks</h1>
                        </div>
                        <p className="text-xl text-text/40 font-semibold max-w-2xl leading-relaxed">Coordinate initiatives and eliminate blockers across all workspace intelligence streams.</p>
                    </div>

                    <div className="flex items-center gap-2 p-2 bg-text/3 border border-text/5 rounded-4xl">
                        {(["pending", "completed", "all"] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-8 py-3 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${filter === f
                                    ? "bg-background text-text shadow-xl border border-text/10"
                                    : "text-text/30 hover:text-text/60"
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
                <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 py-8 pb-48">
                    {filteredTasks.length === 0 ? (
                        <div className="bg-text/2 border border-text/5 rounded-[3rem] py-32 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-text/5 rounded-full flex items-center justify-center text-text/10 mb-8">
                                <Sparkles className="w-10 h-10" />
                            </div>
                            <h2 className="text-xl font-black text-text">Workspace is Clear</h2>
                            <p className="text-text/40 font-medium mt-2">No pending action items detected.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            <AnimatePresence mode="popLayout">
                                {filteredTasks.map(task => (
                                    <motion.div
                                        key={task.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="group glass-card rounded-4xl p-10 hover:border-accent/40 transition-all duration-700 relative overflow-hidden shadow-premium hover:shadow-premium-hover"
                                    >
                                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                                            <div className="flex items-start gap-6 flex-1">
                                                <button
                                                    onClick={() => handleToggle(task)}
                                                    className={`shrink-0 w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all ${task.completed
                                                        ? 'bg-accent border-accent text-background'
                                                        : 'border-text/10 group-hover:border-accent/40 text-transparent'
                                                        }`}
                                                >
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </button>

                                                <div className="space-y-3">
                                                    <h3 className={`text-xl font-black transition-all ${task.completed ? 'text-text/30 line-through' : 'text-text'}`}>
                                                        {task.description}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-4">
                                                        <div className="flex items-center gap-2 px-3 py-1 bg-text/3 rounded-full text-[10px] font-black uppercase tracking-widest text-text/40">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {task.workspace_name || "Personal"}
                                                        </div>
                                                        <div className="flex items-center gap-2 px-3 py-1 bg-accent/5 rounded-full text-[10px] font-black uppercase tracking-widest text-accent">
                                                            <User className="w-3.5 h-3.5" />
                                                            {task.assignee || "Everyone"}
                                                        </div>
                                                        {task.due_date && (
                                                            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/5 rounded-full text-[10px] font-black uppercase tracking-widest text-red-500">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                Due {new Date(task.due_date).toLocaleDateString()}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleNudge(task)}
                                                    disabled={nudgeLoading === task.id || task.completed}
                                                    className="flex items-center gap-2.5 px-6 py-3.5 bg-text text-background rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    {nudgeLoading === task.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                                    Generate Nudge
                                                </button>
                                                <button
                                                    onClick={() => router.push(`/meetings/${task.meeting_id}`)}
                                                    className="p-3.5 bg-text/3 border border-text/10 rounded-2xl text-text/20 hover:text-text hover:border-text/30 transition-all"
                                                    title="View Meeting Source"
                                                >
                                                    <MessageSquare className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${task.completed ? 'bg-text/5' : 'bg-accent shadow-[0_0_20px_rgba(66,174,68,0.4)]'}`} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </main>

            {/* Nudge Modal */}
            <AnimatePresence>
                {nudgeMsg && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
                        onClick={() => setNudgeMsg("")}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-lg bg-background border border-text/10 rounded-4xl shadow-2xl overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between px-10 py-8 border-b border-text/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-text tracking-tight">AI-Generated Nudge</h2>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text/30 mt-0.5">Ready to send</p>
                                    </div>
                                </div>
                                <button onClick={() => setNudgeMsg("")} className="p-3 rounded-2xl hover:bg-text/5 text-text/30 hover:text-text transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="px-10 py-6">
                                <div className="bg-text/3 border border-text/5 rounded-3xl p-6 max-h-60 overflow-y-auto custom-scrollbar">
                                    <p className="text-sm text-text/80 leading-relaxed whitespace-pre-wrap font-semibold">{nudgeMsg}</p>
                                </div>
                            </div>

                            <div className="px-10 pb-10 flex gap-3">
                                <button
                                    onClick={handleCopyNudge}
                                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-500 ${nudgeCopied ? "bg-accent text-background shadow-xl shadow-accent/20" : "bg-text text-background hover:bg-text/90 shadow-xl shadow-text/10"}`}
                                >
                                    {nudgeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {nudgeCopied ? "Copied!" : "Copy to Clipboard"}
                                </button>
                                <button
                                    onClick={() => setNudgeMsg("")}
                                    className="px-8 py-4 rounded-2xl border border-text/10 text-sm font-black text-text/40 hover:text-text hover:bg-text/5 transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl font-black text-xs uppercase tracking-widest ${toast.type === "error" ? "bg-red-500 text-white" : "bg-accent text-background"
                            }`}
                    >
                        <AlertCircle className="w-4 h-4" />
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
