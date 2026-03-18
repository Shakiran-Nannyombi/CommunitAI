"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
    getGlobalTasks, completeActionItem, generateNudge, loadAuth,
    type GlobalActionItem 
} from "@/lib/api";
import { 
    CheckCircle2, AlertCircle, Clock, 
    MessageSquare, Send, Sparkles, 
    Filter, Search, LayoutGrid, List,
    ChevronRight, Loader2, Calendar, User, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TasksPage() {
    const router = useRouter();
    const [tasks, setTasks] = useState<GlobalActionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "pending" | "completed">("pending");
    const [nudgeLoading, setNudgeLoading] = useState<string | null>(null);

    const userId = loadAuth()?.user_id ?? "";

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
        } catch (err) {
            alert("Failed to update status.");
        }
    }

    async function handleNudge(task: GlobalActionItem) {
        setNudgeLoading(task.id);
        try {
            const msg = await generateNudge(task.id);
            alert(`Nudge Generated: "${msg}"`);
        } catch (err) {
            alert("Nudge generation failed.");
        } finally {
            setNudgeLoading(null);
        }
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
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
            {/* Header */}
            <header className="shrink-0 px-10 py-10 border-b border-text/5 bg-background/50 backdrop-blur-md">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <h1 className="text-4xl font-black text-text tracking-tight">Team Tasks</h1>
                        </div>
                        <p className="text-lg text-text/40 font-medium">Coordinate initiatives and eliminate blockers across all meetings.</p>
                    </div>

                    <div className="flex items-center gap-2 p-1.5 bg-text/3 border border-text/5 rounded-3xl">
                        {(["pending", "completed", "all"] as const).map(f => (
                            <button 
                                key={f} 
                                onClick={() => setFilter(f)}
                                className={`px-6 py-2.5 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                                    filter === f 
                                        ? "bg-background text-text shadow-sm border border-text/10" 
                                        : "text-text/30 hover:text-text/60"
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-7xl mx-auto p-10 pb-32">
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
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="group bg-background border border-text/5 rounded-[2.5rem] p-8 hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/2 transition-all duration-500 relative overflow-hidden"
                                    >
                                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                                            <div className="flex items-start gap-6 flex-1">
                                                <button 
                                                    onClick={() => handleToggle(task)}
                                                    className={`shrink-0 w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all ${
                                                        task.completed 
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
                                                                Due soon
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => handleNudge(task)}
                                                    disabled={nudgeLoading === task.id || task.completed}
                                                    className="flex items-center gap-2.5 px-6 py-3.5 bg-text text-background rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-0"
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
                                        {/* Activity Accent Bar */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${task.completed ? 'bg-text/5' : 'bg-accent shadow-[0_0_20px_rgba(66,174,68,0.4)]'}`} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
