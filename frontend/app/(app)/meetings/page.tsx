"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
    getMeetings, loadAuth, uploadAudio, createMeeting,
    type MeetingListItem, type AuthUser 
} from "@/lib/api";
import { 
    Mic, Search, Filter, Upload, MoreVertical, 
    Calendar, Clock, ChevronRight, ChevronLeft,
    AlertCircle, CheckCircle2, Loader2, Play
} from "lucide-react";
import Link from "next/link";

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: any }> = {
    pending: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "Pending", icon: Clock },
    processing: { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", label: "Processing", icon: Loader2 },
    transcribed: { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", label: "Transcribed", icon: CheckCircle2 },
    complete: { color: "text-accent", bg: "bg-accent/10 border-accent/20", label: "Complete", icon: CheckCircle2 },
    failed: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", label: "Failed", icon: AlertCircle },
};

export default function MeetingsLibrary() {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");

    const loadData = useCallback(async (uid: string) => {
        try {
            const data = await getMeetings(uid);
            setMeetings(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const auth = loadAuth();
        if (!auth) { router.replace("/login"); return; }
        setUser(auth);
        loadData(auth.user_id);
    }, [router, loadData]);

    const filteredMeetings = meetings.filter(m => {
        const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === "all" || m.status === filter;
        return matchesSearch && matchesFilter;
    });

    if (!user) return null;

    return (
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
            {/* Header */}
            <header className="shrink-0 px-10 py-8 border-b border-text/5 bg-background/80 backdrop-blur-md sticky top-0 z-20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-accent/10 text-accent rounded-2xl shadow-inner border border-accent/10">
                            <Mic className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-text tracking-tight">Recordings Library</h1>
                            <p className="text-text/40 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">
                                {meetings.length} Total Records
                            </p>
                        </div>
                    </div>
                    <button className="flex items-center gap-3 px-8 py-4 bg-accent text-background font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-accent/20">
                        <Upload className="w-5 h-5" />
                        Upload a Recording
                    </button>
                </div>
            </header>

            {/* Search and Filters */}
            <section className="shrink-0 px-10 py-6 bg-text/2 border-b border-text/5">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text/20 group-focus-within:text-accent transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search by title, sentiment, or speaker..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-background border border-text/10 rounded-2xl pl-12 pr-6 py-4 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-accent/5 focus:border-accent/40 transition-all placeholder:text-text/20"
                        />
                    </div>
                    <div className="flex gap-2 h-14">
                        {["all", "complete", "processing", "pending"].map(f => (
                            <button 
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                    filter === f 
                                        ? "bg-accent text-background border-accent shadow-lg shadow-accent/10" 
                                        : "bg-background text-text/40 border-text/10 hover:border-text/30 hover:text-text/60"
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <div className="max-w-7xl mx-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-4">
                            <Loader2 className="w-10 h-10 text-accent animate-spin" />
                            <p className="text-sm font-bold text-text/40 uppercase tracking-widest">Loading Library...</p>
                        </div>
                    ) : filteredMeetings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-40 text-center space-y-8">
                            <div className="w-24 h-24 rounded-full bg-text/5 flex items-center justify-center text-text/10">
                                <Mic className="w-12 h-12" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-text">No recordings yet</h2>
                                <p className="text-text/40 font-medium max-w-sm mx-auto mt-2">Start capturing your meetings and let CommunitAI help you uncover hidden insights.</p>
                            </div>
                            <button className="bg-accent text-background font-black px-8 py-4 rounded-2xl shadow-xl shadow-accent/20 hover:scale-105 transition-transform">
                                Create First Workspace
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {filteredMeetings.map(m => {
                                const StatusIcon = STATUS_CONFIG[m.status]?.icon || AlertCircle;
                                const statusColor = STATUS_CONFIG[m.status]?.color || "text-text/40";
                                const statusBg = STATUS_CONFIG[m.status]?.bg || "bg-text/5";
                                
                                return (
                                    <Link key={m.id} href={`/meetings/${m.id}`} className="group bg-background border border-text/10 rounded-4xl p-6 hover:border-accent/40 hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] transition-all duration-500 flex flex-col group">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${statusBg} ${statusColor} border border-current/10 flex items-center gap-2`}>
                                                <StatusIcon className={`w-3 h-3 ${m.status === 'processing' ? 'animate-spin' : ''}`} />
                                                {STATUS_CONFIG[m.status]?.label || m.status}
                                            </div>
                                            <button className="p-2 text-text/20 hover:text-text rounded-lg transition-colors">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <h3 className="text-xl font-black text-text mb-2 group-hover:text-accent transition-colors truncate">
                                            {m.title}
                                        </h3>

                                        <div className="flex items-center gap-5 text-text/40 text-[10px] font-bold uppercase tracking-widest mb-6">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(m.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5" />
                                                42m 15s
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-6 border-t border-text/5 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                                                    <Play className="w-4 h-4 fill-current" />
                                                </div>
                                                <span className="text-[10px] font-black text-text/60 uppercase tracking-widest">Listen Now</span>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-text/20 group-hover:text-accent group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    {/* Pagination */}
                    <div className="mt-16 pt-10 border-t border-text/10 flex items-center justify-between">
                        <p className="text-[10px] font-black text-text/30 uppercase tracking-[0.2em]">
                            Showing {filteredMeetings.length} of {meetings.length} recordings
                        </p>
                        <div className="flex gap-3">
                            <button className="p-3 rounded-xl border border-text/10 text-text/20 hover:text-accent hover:border-accent/40 transition-all">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button className="p-3 rounded-xl border border-text/10 text-text/20 hover:text-accent hover:border-accent/40 transition-all">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
