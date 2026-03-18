"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
    getMeeting, patchTranscript, patchActionItem, shareToSlack, deleteMeeting, loadAuth,
    type MeetingDetail, type ActionItem 
} from "@/lib/api";
import { 
    Mic, Calendar, Clock, ChevronLeft, 
    MoreVertical, Share2, Trash2, Edit3, 
    CheckCircle2, Sparkles, MessageSquare, 
    BarChart3, Plus, Slack, Loader2, AlertCircle,
    Play, Pause, Volume2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Section = "summary" | "tasks" | "transcript" | "sentiment";

export default function MeetingInsights() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();

    const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<Section>("summary");
    const [isEditingTranscript, setIsEditingTranscript] = useState(false);
    const [transcriptEdit, setTranscriptEdit] = useState("");
    const [sharing, setSharing] = useState(false);
    const [shared, setShared] = useState(false);

    const loadData = useCallback(async () => {
        if (!id) return;
        try {
            const data = await getMeeting(id);
            setMeeting(data);
            setTranscriptEdit(data.transcript || "");
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (!loadAuth()) { router.replace("/login"); return; }
        loadData();
    }, [id, router, loadData]);

    async function handleSaveTranscript() {
        if (!meeting) return;
        try {
            await patchTranscript(meeting.id, transcriptEdit);
            setMeeting({ ...meeting, transcript: transcriptEdit });
            setIsEditingTranscript(false);
        } catch (err) {
            alert("Failed to save transcript update.");
        }
    }

    async function handleToggleTask(task: ActionItem) {
        if (!meeting) return;
        try {
            const updated = await patchActionItem(task.id, { completed: !task.completed });
            setMeeting({
                ...meeting,
                action_items: meeting.action_items.map(t => t.id === task.id ? updated : t)
            });
        } catch (err) {
            alert("Failed to update task.");
        }
    }

    async function handleShareSlack() {
        if (!meeting) return;
        setSharing(true);
        try {
            await shareToSlack(meeting.id);
            setShared(true);
            setTimeout(() => setShared(false), 3000);
        } catch (err) {
            alert("Slack integration not configured or failed.");
        } finally {
            setSharing(false);
        }
    }

    if (loading) return (
        <div className="flex-1 flex items-center justify-center bg-background">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
    );

    if (!meeting) return (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-2xl font-black text-text">Record Not Found</h2>
            <button onClick={() => router.back()} className="mt-8 text-accent font-black uppercase text-[10px] tracking-widest">Go Back</button>
        </div>
    );

    return (
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
            {/* Nav Header */}
            <header className="shrink-0 px-10 py-6 border-b border-text/5 bg-background/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center gap-6">
                    <button onClick={() => router.back()} className="p-3 bg-text/3 hover:bg-text/5 rounded-2xl transition-colors text-text/40 hover:text-text">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-text tracking-tight flex items-center gap-3">
                            {meeting.title}
                            <span className="px-2 py-0.5 bg-accent/10 text-accent text-[8px] font-black uppercase tracking-widest rounded-full border border-accent/20">PROCESSED</span>
                        </h1>
                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-text/30 mt-1">
                            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(meeting.created_at).toLocaleDateString()}</span>
                            <span className="w-1 h-1 rounded-full bg-text/10" />
                            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 42:15</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleShareSlack}
                        disabled={sharing}
                        className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                            shared ? 'bg-accent text-background border-accent' : 'bg-text/3 text-text/40 border border-text/10 hover:border-text/30 hover:text-text'
                        }`}
                    >
                        {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Slack className="w-4 h-4" />}
                        {shared ? 'SYNALYZED TO SLACK' : 'SHARE RESULTS'}
                    </button>
                    <button className="p-3 bg-red-500/5 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Scrollable Main Area */}
                <main className="flex-1 overflow-y-auto px-10 py-12 custom-scrollbar lg:pr-6">
                    <div className="max-w-4xl mx-auto space-y-16">
                        {/* Audio Player Card (Simulated) */}
                        <section className="p-8 bg-text/2 border border-text/5 rounded-[3rem] relative overflow-hidden group">
                            <div className="absolute inset-0 bg-accent/1 pointer-events-none group-hover:bg-accent/3 transition-colors" />
                            <div className="relative z-10 flex items-center gap-8">
                                <button className="w-16 h-16 bg-text text-background rounded-3xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-text/10">
                                    <Play className="w-6 h-6 fill-current" />
                                </button>
                                <div className="flex-1 space-y-4">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-text/30">
                                        <span>0:00</span>
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-3 h-3 text-accent" />
                                            <span>AI Confidence: 98%</span>
                                        </div>
                                        <span>42:15</span>
                                    </div>
                                    <div className="h-2 w-full bg-text/5 rounded-full overflow-hidden relative">
                                        <div className="absolute inset-0 bg-accent/20 w-1/3" />
                                        {/* Simulated Waveform effect */}
                                        <div className="absolute inset-0 flex items-center justify-between px-2 opacity-20">
                                            {Array.from({ length: 40 }).map((_, i) => (
                                                <div key={i} className="w-1 bg-text/20 rounded-full" style={{ height: `${Math.random() * 80 + 20}%` }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-text/20">
                                    <Volume2 className="w-5 h-5" />
                                    <MoreVertical className="w-5 h-5" />
                                </div>
                            </div>
                        </section>

                        {/* Analysis Hub */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                            {/* Left Navigation */}
                            <nav className="lg:col-span-1 space-y-2">
                                {[
                                    { id: "summary", label: "Executive Summary", icon: MessageSquare },
                                    { id: "tasks", label: "Action Items", icon: CheckCircle2 },
                                    { id: "sentiment", label: "Sentiment Hub", icon: BarChart3 },
                                    { id: "transcript", label: "Smart Transcript", icon: Mic },
                                ].map(sec => (
                                    <button 
                                        key={sec.id}
                                        onClick={() => setActiveSection(sec.id as Section)}
                                        className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            activeSection === sec.id 
                                                ? 'bg-text text-background shadow-xl shadow-text/5' 
                                                : 'text-text/30 hover:text-text/60 hover:bg-text/5'
                                        }`}
                                    >
                                        <sec.icon className="w-4 h-4" />
                                        {sec.label}
                                    </button>
                                ))}
                            </nav>

                            {/* Dynamic Content */}
                            <div className="lg:col-span-4 min-h-[500px]">
                                <AnimatePresence mode="wait">
                                    {activeSection === "summary" && (
                                        <motion.div 
                                            key="summary"
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                            className="space-y-8"
                                        >
                                            <div className="space-y-4">
                                                <h3 className="text-2xl font-black text-text tracking-tight">Meeting Context</h3>
                                                <p className="text-lg leading-relaxed text-text/70 font-medium">
                                                    {meeting.summary || "Generating abstract summary..."}
                                                </p>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="p-6 bg-accent/5 border border-accent/10 rounded-3xl">
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-accent mb-2">Key Theme</h4>
                                                    <p className="text-sm font-black text-text">Community Growth & Retention</p>
                                                </div>
                                                <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl">
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">Top Speaker</h4>
                                                    <p className="text-sm font-black text-text">Jane Cooper (42% airtime)</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {activeSection === "tasks" && (
                                        <motion.div 
                                            key="tasks"
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                            className="space-y-8"
                                        >
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-2xl font-black text-text tracking-tight">Critical Actions</h3>
                                                <button className="flex items-center gap-2 px-4 py-2 bg-text text-background rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform">
                                                    <Plus className="w-3.5 h-3.5" /> Add Task
                                                </button>
                                            </div>

                                            <div className="space-y-4">
                                                {meeting.action_items.length === 0 ? (
                                                    <p className="py-12 text-center text-text/30 font-bold uppercase tracking-widest text-xs border border-dashed border-text/10 rounded-3xl">No action items detected</p>
                                                ) : (
                                                    meeting.action_items.map(task => (
                                                        <div key={task.id} className="group p-6 bg-background border border-text/10 rounded-3xl hover:border-accent/40 transition-all flex items-center justify-between">
                                                            <div className="flex items-center gap-5">
                                                                <button 
                                                                    onClick={() => handleToggleTask(task)}
                                                                    className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${
                                                                        task.completed ? 'bg-accent border-accent text-background' : 'border-text/10 group-hover:border-accent/40 text-transparent'
                                                                    }`}
                                                                >
                                                                    <CheckCircle2 className="w-4 h-4" />
                                                                </button>
                                                                <div>
                                                                    <p className={`font-black transition-all ${task.completed ? 'text-text/30 line-through' : 'text-text'}`}>
                                                                        {task.description}
                                                                    </p>
                                                                    <div className="flex items-center gap-3 text-[9px] font-bold text-text/30 uppercase tracking-[0.2em] mt-1">
                                                                        <span className="text-accent">{task.assignee || "Everyone"}</span>
                                                                        {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button className="p-2 text-text/10 hover:text-text transition-colors">
                                                                <Edit3 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </motion.div>
                                    )}

                                    {activeSection === "sentiment" && (
                                        <motion.div 
                                            key="sentiment"
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                            className="space-y-8"
                                        >
                                            <h3 className="text-2xl font-black text-text tracking-tight">Emotional Pulse</h3>
                                            
                                            <div className="p-10 bg-text/3 border border-text/5 rounded-[3rem] text-center space-y-6">
                                                <div className="inline-block p-6 bg-accent/20 rounded-[2.5rem] border border-accent/20">
                                                    <h4 className="text-sm font-black text-accent uppercase tracking-widest mb-1">Overall Sentiment</h4>
                                                    <p className="text-5xl font-black capitalize tracking-tighter text-text">
                                                        {meeting.sentiment?.classification || "Neutral"}
                                                    </p>
                                                </div>
                                                <p className="text-text/40 font-medium max-w-sm mx-auto">The community seems energized and focused on the new roadmap features.</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {meeting.sentiment?.signals.map((sig, i) => (
                                                    <div key={i} className="p-6 border border-text/10 rounded-3xl hover:bg-text/2 transition-colors">
                                                        <span className="text-[10px] font-black uppercase text-accent tracking-widest mb-3 block">{sig.type}</span>
                                                        <blockquote className="text-sm italic font-medium text-text/60 leading-relaxed group">
                                                            "{sig.excerpt}"
                                                        </blockquote>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}

                                    {activeSection === "transcript" && (
                                        <motion.div 
                                            key="transcript"
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                            className="space-y-8"
                                        >
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-2xl font-black text-text tracking-tight">Full Transcript</h3>
                                                <button 
                                                    onClick={() => {
                                                        if (isEditingTranscript) handleSaveTranscript();
                                                        else setIsEditingTranscript(true);
                                                    }}
                                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                        isEditingTranscript ? 'bg-accent text-background' : 'bg-text/5 text-text/40 hover:text-text'
                                                    }`}
                                                >
                                                    {isEditingTranscript ? 'Save Changes' : 'Edit Script'}
                                                </button>
                                            </div>
                                            
                                            <div className="p-8 bg-text/2 border border-text/5 rounded-[3rem] min-h-[400px]">
                                                {isEditingTranscript ? (
                                                    <textarea 
                                                        value={transcriptEdit}
                                                        onChange={(e) => setTranscriptEdit(e.target.value)}
                                                        className="w-full h-[500px] bg-transparent border-none focus:ring-0 text-sm font-medium leading-loose custom-scrollbar text-text"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <p className="text-sm font-medium leading-loose text-text/60 whitespace-pre-wrap">
                                                        {meeting.transcript || "Transcript is still being generated by the AI engine..."}
                                                    </p>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
