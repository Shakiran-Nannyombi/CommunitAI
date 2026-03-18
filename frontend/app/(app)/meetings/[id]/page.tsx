"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    getMeeting, patchTranscript, patchActionItem, deleteMeeting, loadAuth,
    type MeetingDetail, type ActionItem
} from "@/lib/api";
import {
    Mic, Calendar, Clock, ChevronLeft,
    MoreVertical, Share2, Trash2, Edit3,
    CheckCircle2, Sparkles, MessageSquare,
    BarChart3, Plus, Loader2, AlertCircle,
    Play, Pause, Volume2, Copy, Check, X, Mail
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Section = "summary" | "tasks" | "transcript" | "sentiment";
type ShareTab = "slack" | "email";

export default function MeetingInsights() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();

    const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<Section>("summary");
    const [isEditingTranscript, setIsEditingTranscript] = useState(false);
    const [transcriptEdit, setTranscriptEdit] = useState("");
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareTab, setShareTab] = useState<ShareTab>("slack");
    const [copied, setCopied] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const audioEl = useRef<HTMLAudioElement | null>(null);

    function formatTime(s: number) {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, "0")}`;
    }

    function togglePlay() {
        const a = audioEl.current;
        if (!a) return;
        if (isPlaying) { a.pause(); setIsPlaying(false); }
        else { a.play(); setIsPlaying(true); }
    }

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

    function buildSlackDraft(m: MeetingDetail): string {
        const items = m.action_items.map((a, i) => `${i + 1}. ${a.description}${a.assignee ? ` — @${a.assignee}` : ""}`).join("\n");
        return `*Meeting: ${m.title}*\n\n${m.summary || "No summary available."}\n\n*Action Items:*\n${items || "None"}`;
    }

    function buildEmailDraft(m: MeetingDetail): string {
        const items = m.action_items.map((a, i) => `${i + 1}. ${a.description}${a.assignee ? ` (${a.assignee})` : ""}`).join("\n");
        return `Subject: Meeting Notes — ${m.title}\n\nHi team,\n\n${m.summary || "No summary available."}\n\nAction Items:\n${items || "None"}\n\nBest,\nCommunitAI`;
    }

    async function handleCopy() {
        if (!meeting) return;
        const text = shareTab === "slack" ? buildSlackDraft(meeting) : buildEmailDraft(meeting);
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-accent/5 blur-[100px] rounded-full pointer-events-none" />
            {/* Nav Header */}
            {/* Nav Header */}
            <header className="shrink-0 px-16 lg:px-20 py-10 bg-background/50 backdrop-blur-xl flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center gap-8">
                    <button onClick={() => router.back()} className="p-4 bg-text/3 hover:bg-accent/5 hover:text-accent rounded-2xl transition-all duration-500 text-text/40 shadow-sm">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-text tracking-tighter flex items-center gap-4">
                            {meeting.title}
                            <span className="px-3 py-1 bg-accent/10 border border-accent/20 text-accent text-[9px] font-black uppercase tracking-[0.2em] rounded-full shadow-2xl shadow-accent/5">PROCESSED</span>
                        </h1>
                        <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.3em] text-text/30">
                            <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(meeting.created_at).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-accent/40" />
                            <span className="flex items-center gap-2"><Clock className="w-4 h-4 ml-1" /> 42:15</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowShareModal(true)}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-700 shadow-2xl bg-text/3 text-text/40 border border-text/5 hover:border-accent/40 hover:text-accent hover:bg-accent/5 shadow-text/5"
                    >
                        <Share2 className="w-4 h-4" />
                        SHARE RESULTS
                    </button>
                    <button className="p-4 bg-red-500/5 text-red-500/20 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all duration-500 shadow-sm">
                        <Trash2 className="w-6 h-6" />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Scrollable Main Area */}
                <main className="flex-1 overflow-y-auto px-16 lg:px-20 py-16 custom-scrollbar relative z-10 lg:pr-10">
                    <div className="max-w-4xl mx-auto space-y-16">
                        {/* Audio Player */}
                        <section className="p-10 glass-card rounded-4xl relative overflow-hidden group shadow-premium">
                            {meeting.audio_url && (
                                <audio
                                    ref={audioEl}
                                    src={meeting.audio_url}
                                    onTimeUpdate={(e) => {
                                        const a = e.currentTarget;
                                        setCurrentTime(a.currentTime);
                                        setAudioProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
                                    }}
                                    onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
                                    onEnded={() => setIsPlaying(false)}
                                />
                            )}
                            <div className="relative z-10 flex items-center gap-10">
                                <button
                                    onClick={togglePlay}
                                    disabled={!meeting.audio_url}
                                    className="w-20 h-20 bg-text text-background rounded-3xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-500 shadow-2xl shadow-text/10 disabled:opacity-30"
                                >
                                    {isPlaying
                                        ? <Pause className="w-8 h-8 fill-current" />
                                        : <Play className="w-8 h-8 fill-current ml-1" />}
                                </button>
                                <div className="flex-1 space-y-6">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.3em] text-text/30">
                                        <span>{formatTime(currentTime)}</span>
                                        <div className="flex items-center gap-3">
                                            <Sparkles className="w-4 h-4 text-accent" />
                                            <span className="text-accent">AI SYNERGY: 98.4%</span>
                                        </div>
                                        <span>{audioDuration ? formatTime(audioDuration) : "--:--"}</span>
                                    </div>
                                    <div
                                        className="h-3 w-full bg-text/5 rounded-full overflow-hidden relative shadow-inner cursor-pointer"
                                        onClick={(e) => {
                                            const a = audioEl.current;
                                            if (!a || !a.duration) return;
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const pct = (e.clientX - rect.left) / rect.width;
                                            a.currentTime = pct * a.duration;
                                        }}
                                    >
                                        <div className="absolute inset-y-0 left-0 bg-accent/60 transition-all" style={{ width: `${audioProgress}%` }} />
                                        <div className="absolute inset-0 flex items-center justify-between px-3 opacity-20">
                                            {Array.from({ length: 60 }).map((_, i) => (
                                                <div key={i} className="w-1 bg-text/40 rounded-full" style={{ height: `${Math.random() * 80 + 20}%` }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 text-text/20">
                                    <Volume2 className="w-6 h-6 hover:text-text transition-colors cursor-pointer" />
                                    <MoreVertical className="w-6 h-6 hover:text-text transition-colors cursor-pointer" />
                                </div>
                            </div>
                        </section>

                        {/* Analysis Hub */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                            {/* Left Navigation */}
                            <nav className="lg:col-span-1 space-y-3">
                                {[
                                    { id: "summary", label: "Executive Summary", icon: MessageSquare },
                                    { id: "tasks", label: "Action Items", icon: CheckCircle2 },
                                    { id: "sentiment", label: "Sentiment Hub", icon: BarChart3 },
                                    { id: "transcript", label: "Smart Transcript", icon: Mic },
                                ].map(sec => (
                                    <button
                                        key={sec.id}
                                        onClick={() => setActiveSection(sec.id as Section)}
                                        className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${activeSection === sec.id
                                            ? 'bg-text text-background shadow-2xl shadow-text/10 scale-105'
                                            : 'text-text/30 hover:text-text/60 hover:bg-text/5'
                                            }`}
                                    >
                                        <sec.icon className="w-5 h-5" />
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
                                            <div className="space-y-6">
                                                <h3 className="text-3xl font-black text-text tracking-tighter">Meeting Context</h3>
                                                <p className="text-2xl leading-relaxed text-text/60 font-semibold tracking-tight">
                                                    {meeting.summary || "Generating abstract summary..."}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-8">
                                                <div className="p-8 glass-card rounded-4xl bg-accent/5">
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent mb-3">Key Theme</h4>
                                                    <p className="text-lg font-black text-text">Community Growth & Retention</p>
                                                </div>
                                                <div className="p-8 glass-card rounded-4xl bg-blue-500/5">
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-3">Top Speaker</h4>
                                                    <p className="text-lg font-black text-text">Jane Cooper (42% airtime)</p>
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

                                            <div className="space-y-6">
                                                {meeting.action_items.length === 0 ? (
                                                    <p className="py-24 text-center text-text/20 font-black uppercase tracking-[0.3em] text-[10px] border-2 border-dashed border-text/5 rounded-4xl">No action items detected in stream</p>
                                                ) : (
                                                    meeting.action_items.map(task => (
                                                        <div key={task.id} className="group p-8 glass-card rounded-4xl hover:border-accent/40 transition-all duration-700 flex items-center justify-between shadow-premium hover:shadow-premium-hover">
                                                            <div className="flex items-center gap-8">
                                                                <button
                                                                    onClick={() => handleToggleTask(task)}
                                                                    className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 ${task.completed ? 'bg-accent border-accent text-background shadow-xl shadow-accent/20' : 'border-text/10 group-hover:border-accent/40 text-transparent'
                                                                        }`}
                                                                >
                                                                    <CheckCircle2 className="w-5 h-5" />
                                                                </button>
                                                                <div>
                                                                    <p className={`text-lg font-black transition-all duration-700 tracking-tight ${task.completed ? 'text-text/20 line-through' : 'text-text'}`}>
                                                                        {task.description}
                                                                    </p>
                                                                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] mt-2">
                                                                        <span className="text-accent">{task.assignee || "EVERYONE"}</span>
                                                                        {task.due_date && <span className="text-text/20">DUE: {new Date(task.due_date).toLocaleDateString()}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button className="p-3 text-text/10 hover:text-text transition-colors duration-500">
                                                                <Edit3 className="w-5 h-5" />
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

                                            <div className="p-16 glass-card rounded-[3rem] text-center space-y-10 shadow-premium group">
                                                <div className="inline-block p-10 bg-accent/20 rounded-4xl border border-accent/20 shadow-2xl shadow-accent/5 group-hover:scale-110 transition-transform duration-700">
                                                    <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-2">Overall Sentiment</h4>
                                                    <p className="text-7xl font-black capitalize tracking-tighter text-text">
                                                        {meeting.sentiment?.classification || "Neutral"}
                                                    </p>
                                                </div>
                                                <p className="text-xl text-text/40 font-semibold max-w-sm mx-auto leading-relaxed">The community seems energized and focused on the new roadmap features.</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                {meeting.sentiment?.signals.map((sig, i) => (
                                                    <div key={i} className="p-8 glass-card rounded-4xl hover:border-accent/40 transition-all duration-700">
                                                        <span className="text-[10px] font-black uppercase text-accent tracking-[0.3em] mb-4 block">{sig.type}</span>
                                                        <blockquote className="text-base italic font-semibold text-text/60 leading-relaxed group">
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
                                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isEditingTranscript ? 'bg-accent text-background' : 'bg-text/5 text-text/40 hover:text-text'
                                                        }`}
                                                >
                                                    {isEditingTranscript ? 'Save Changes' : 'Edit Script'}
                                                </button>
                                            </div>

                                            <div className="p-12 glass-card rounded-4xl min-h-[500px]">
                                                {isEditingTranscript ? (
                                                    <textarea
                                                        value={transcriptEdit}
                                                        onChange={(e) => setTranscriptEdit(e.target.value)}
                                                        className="w-full h-[600px] bg-transparent border-none focus:ring-0 text-lg font-semibold leading-relaxed custom-scrollbar text-text/80"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <p className="text-lg font-semibold leading-relaxed text-text/50 whitespace-pre-wrap selection:bg-accent/20">
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

            {/* Share Modal */}
            <AnimatePresence>
                {showShareModal && meeting && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
                        onClick={() => setShowShareModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-lg bg-background border border-text/10 rounded-4xl shadow-2xl overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-10 py-8 border-b border-text/5">
                                <div>
                                    <h2 className="text-xl font-black text-text tracking-tighter">Share Results</h2>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text/30 mt-1">Copy a draft to send</p>
                                </div>
                                <button onClick={() => setShowShareModal(false)} className="p-3 rounded-2xl hover:bg-text/5 text-text/30 hover:text-text transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2 px-10 pt-6">
                                {(["slack", "email"] as ShareTab[]).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => { setShareTab(tab); setCopied(false); }}
                                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${shareTab === tab ? "bg-text text-background" : "text-text/30 hover:text-text hover:bg-text/5"}`}
                                    >
                                        {tab === "slack" ? "Slack" : "Email"}
                                    </button>
                                ))}
                            </div>

                            {/* Draft Preview */}
                            <div className="px-10 py-6">
                                <pre className="w-full h-56 bg-text/3 border border-text/5 rounded-2xl p-6 text-sm font-mono text-text/60 whitespace-pre-wrap overflow-y-auto custom-scrollbar leading-relaxed">
                                    {shareTab === "slack" ? buildSlackDraft(meeting) : buildEmailDraft(meeting)}
                                </pre>
                            </div>

                            {/* Copy Button */}
                            <div className="px-10 pb-10">
                                <button
                                    onClick={handleCopy}
                                    className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-500 ${copied ? "bg-accent text-background shadow-xl shadow-accent/20" : "bg-text text-background hover:bg-text/90 shadow-xl shadow-text/10"}`}
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {copied ? "Copied!" : `Copy ${shareTab === "slack" ? "Slack" : "Email"} Draft`}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
