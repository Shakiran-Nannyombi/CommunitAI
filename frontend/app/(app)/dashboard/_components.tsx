"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type Workspace, type MeetingListItem, type GlobalActionItem } from "@/lib/api";
import {
    LayoutDashboard,
    CheckSquare,
    Mic,
    Paperclip,
    FileAudio,
    MessageSquare,
    ChevronRight,
    Calendar,
    User as UserIcon,
    Check,
    Zap,
    Sparkles
} from "lucide-react";

const PROCESSING = new Set(["pending", "processing", "transcribed"]);

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
    pending: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "Pending" },
    processing: { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", label: "Processing" },
    transcribed: { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", label: "Transcribed" },
    complete: { color: "text-accent", bg: "bg-accent/10 border-accent/20", label: "Complete" },
    transcription_failed: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", label: "Failed" },
    analysis_failed: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", label: "Failed" },
    summarization_failed: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", label: "Failed" },
};

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? { color: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-500/20", label: status };

    // Stitch style badges for specific states
    if (status === "complete") {
        return (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest badge-processed">
                Processed
            </span>
        );
    }
    if (status === "archived") {
        return (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest badge-archived">
                Archived
            </span>
        );
    }

    return (
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
            {PROCESSING.has(status) && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
            {cfg.label}
        </span>
    );
}

// ── Upload Form ──────────────────────────────────────────────────────────────

export function UploadForm({ title, setTitle, file, setFile, uploading, uploadErr, onUpload, activeWs }: {
    title: string; setTitle: (v: string) => void;
    file: File | null; setFile: (v: File | null) => void;
    uploading: boolean; uploadErr: string;
    onUpload: (e: React.FormEvent) => void;
    activeWs?: Workspace | null;
}) {
    return (
        <form onSubmit={onUpload} className="space-y-4">
            <div className="relative group">
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder={`Meeting title${activeWs ? ` · ${activeWs.name}` : ""}`}
                    required
                    className="w-full bg-text/5 border border-text/10 rounded-xl px-4 py-3 text-sm text-text placeholder-text/30 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all duration-200" />
            </div>
            <div className="flex gap-3">
                <label className="flex-1 cursor-pointer">
                    <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 text-sm transition-all duration-200 group ${file ? "border-accent/30 bg-accent/5 text-accent" : "border-text/5 bg-text/5 text-text/50 hover:border-text/10 hover:bg-text/10"}`}>
                        {file ? <FileAudio className="w-4 h-4 text-accent" /> : <Paperclip className="w-4 h-4 text-text/40 group-hover:text-text/60" />}
                        <span className="truncate font-medium">{file ? file.name : "Choose audio file…"}</span>
                    </div>
                    <input type="file" accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/aac,audio/x-aac"
                        onChange={e => setFile(e.target.files?.[0] ?? null)} className="hidden" required />
                </label>
                <button type="submit" disabled={uploading}
                    className="px-6 py-3 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-50 text-background font-bold text-sm transition-all duration-200 whitespace-nowrap shadow-lg shadow-accent/10">
                    {uploading ? "Uploading…" : "Upload"}
                </button>
            </div>
            {uploadErr && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-medium bg-red-400/5 border border-red-400/10 px-3 py-2 rounded-lg">
                    <span>⚠️</span> {uploadErr}
                </div>
            )}
        </form>
    );
}

// ── Overview Tab ─────────────────────────────────────────────────────────────

export function OverviewTab({ workspaces, meetings, pendingTasks, onComplete, onNudge, nudgeLoading,
    title, setTitle, file, setFile, uploading, uploadErr, onUpload, activeWs }: {
        workspaces: Workspace[]; meetings: MeetingListItem[]; pendingTasks: GlobalActionItem[];
        onComplete: (id: string) => void; onNudge: (item: GlobalActionItem) => void; nudgeLoading: string | null;
        title: string; setTitle: (v: string) => void; file: File | null; setFile: (v: File | null) => void;
        uploading: boolean; uploadErr: string; onUpload: (e: React.FormEvent) => void;
        activeWs: Workspace | null;
    }) {
    const router = useRouter();
    const recentMeetings = meetings.slice(0, 3);
    const completedCount = meetings.filter(m => m.status === "complete").length;

    return (
        <div className="space-y-12 pb-32">
            {/* 1. Community Health Stats */}
            <section>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-background border border-text/5 rounded-3xl p-8 group hover:shadow-xl transition-all duration-500">
                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3 rounded-2xl bg-accent/10 text-accent transition-transform duration-500 group-hover:bg-accent group-hover:text-background">
                                <Zap className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-accent/50">Live</span>
                        </div>
                        <p className="text-[11px] font-black text-text/30 uppercase tracking-[0.2em]">Sentiment Index</p>
                        <h2 className="text-5xl font-black text-text mt-1 tracking-tighter">82%</h2>
                        <div className="mt-8">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-text/5">
                                <div className="h-full bg-accent" style={{ width: "82%" }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-background border border-text/5 rounded-3xl p-8 group hover:shadow-xl transition-all duration-500">
                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 transition-transform duration-500 group-hover:bg-amber-500 group-hover:text-background">
                                <CheckSquare className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500/50">High Priority</span>
                        </div>
                        <p className="text-[11px] font-black text-text/30 uppercase tracking-[0.2em]">Action Items</p>
                        <h2 className="text-5xl font-black text-text mt-1 tracking-tighter">
                            {pendingTasks.length} <span className="text-xl font-black text-text/20">pending</span>
                        </h2>
                        <p className="mt-8 text-[10px] font-black uppercase tracking-widest text-text/20">3 flagged by ai as critical</p>
                    </div>

                    <div className="bg-background border border-text/5 rounded-3xl p-8 group hover:shadow-xl transition-all duration-500">
                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 transition-transform duration-500 group-hover:bg-blue-500 group-hover:text-background">
                                <FileAudio className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500/50">This Month</span>
                        </div>
                        <p className="text-[11px] font-black text-text/30 uppercase tracking-[0.2em]">Total Transcripts</p>
                        <h2 className="text-5xl font-black text-text mt-1 tracking-tighter">{meetings.length}</h2>
                        <p className="mt-8 text-[10px] font-black uppercase tracking-widest text-text/20">+12% from last week</p>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 2. Recent Activity */}
                <section className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-black flex items-center gap-3 tracking-tighter">
                            <div className="p-1.5 rounded-lg bg-accent/10 border border-accent/20">
                                <LayoutDashboard className="w-4 h-4 text-accent" />
                            </div>
                            Recent Activity
                        </h3>
                        <button className="text-[10px] font-black uppercase text-accent/60 hover:text-accent tracking-widest transition-colors">View All</button>
                    </div>
                    <div className="bg-background border border-text/5 rounded-3xl overflow-hidden shadow-sm">
                        <div className="divide-y divide-text/5">
                            {recentMeetings.length === 0 ? (
                                <div className="p-16 text-center">
                                    <p className="text-xs text-text/20 font-black uppercase tracking-[0.2em]">No recent activity found</p>
                                </div>
                            ) : recentMeetings.map((m, idx) => (
                                <div key={m.id} className="flex items-center gap-5 p-6 hover:bg-text/2 transition-all duration-300 group">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-background border border-text/5 text-accent shadow-sm group-hover:border-accent/20 transition-all duration-300">
                                        {idx === 1 ? <UserIcon className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-base font-black text-text truncate tracking-tight">{m.title}</h4>
                                        <p className="text-[10px] font-bold text-text/30 uppercase tracking-widest mt-1">
                                            {idx === 0 ? "2 hours ago" : idx === 1 ? "Yesterday" : "Nov 12"} • 45 mins
                                        </p>
                                    </div>
                                    <StatusBadge status={idx === 2 ? "archived" : "complete"} />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 3. Upcoming Meetings */}
                <section className="space-y-6">
                    <h3 className="text-lg font-black flex items-center gap-3 px-2 tracking-tighter">
                        <div className="p-1.5 rounded-lg bg-accent/10 border border-accent/20">
                            <Calendar className="w-4 h-4 text-accent" />
                        </div>
                        Upcoming
                    </h3>
                    <div className="bg-background border border-text/5 rounded-3xl p-6 space-y-8 shadow-sm">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl bg-text/3 border border-text/5 shrink-0">
                                    <span className="text-[8px] font-black uppercase text-text/20 tracking-tighter">NOV</span>
                                    <span className="text-xl font-black text-text tracking-tighter">15</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-[15px] font-black text-text truncate tracking-tight">Marketing Strategy</h4>
                                    <p className="text-[10px] font-bold text-text/30 uppercase tracking-widest mt-1">10:00 AM • ZOOM</p>
                                </div>
                            </div>
                            <button className="w-full rounded-full border border-accent/30 py-2.5 text-[11px] font-black text-accent hover:bg-accent hover:text-background transition-all duration-300 uppercase tracking-widest shadow-sm">
                                Join & Record
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl bg-text/3 border border-text/5 shrink-0">
                                    <span className="text-[8px] font-black uppercase text-text/20 tracking-tighter">NOV</span>
                                    <span className="text-xl font-black text-text tracking-tighter">16</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-[15px] font-black text-text truncate tracking-tight">Design Critique</h4>
                                    <p className="text-[10px] font-bold text-text/30 uppercase tracking-widest mt-1">02:30 PM • MEET</p>
                                </div>
                            </div>
                            <button className="w-full rounded-full border border-accent/30 py-2.5 text-[11px] font-black text-accent hover:bg-accent hover:text-background transition-all duration-300 uppercase tracking-widest shadow-sm">
                                Join & Record
                            </button>
                        </div>
                    </div>
                </section>
            </div>

            {/* 4. Empty State / Get Started */}
            <section className="dashed-card rounded-3xl p-16 text-center relative overflow-hidden group">
                <div className="mx-auto max-w-[280px] space-y-8 relative z-10 flex flex-col items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-background shadow-xl shadow-accent/20">
                        <Sparkles className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-black text-text tracking-tighter">New around here?</h3>
                        <p className="text-[13px] text-text/40 font-bold leading-relaxed">Upload your first meeting recording or transcript to start getting AI-powered insights for your community.</p>
                    </div>
                    <div className="flex flex-col gap-4 w-full pt-2">
                        <button
                            onClick={() => router.push("/record")}
                            className="flex items-center justify-center gap-2.5 rounded-2xl bg-accent px-8 py-3.5 font-black text-background shadow-xl shadow-accent/10 hover:shadow-accent/20 transition-all uppercase tracking-widest text-[11px]">
                            <FileAudio className="w-4 h-4" />
                            Upload a Recording
                        </button>
                        <button
                            onClick={() => router.push("/workspaces/new")}
                            className="rounded-2xl bg-text/3 px-8 py-3.5 font-black text-text/60 hover:text-text hover:bg-text/6 transition-all uppercase tracking-widest text-[11px] border border-text/5">
                            Create a Workspace
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}

// ── Tasks Tab ─────────────────────────────────────────────────────────────────

export function TasksTab({ tasks, activeWs, onComplete, onNudge, nudgeLoading }: {
    tasks: GlobalActionItem[]; activeWs: Workspace | null;
    onComplete: (id: string) => void; onNudge: (item: GlobalActionItem) => void; nudgeLoading: string | null;
}) {
    const open = tasks.filter(t => !t.completed);
    const done = tasks.filter(t => t.completed);

    return (
        <div className="glass-card rounded-4xl overflow-hidden shadow-2xl">
            <div className="px-10 py-8 border-b border-text/5 flex items-center justify-between bg-text/2">
                <h3 className="text-xl font-black text-text tracking-tighter">
                    {activeWs ? activeWs.name : "Core Initiatives"}
                </h3>
                <span className="text-[10px] font-black text-text/50 bg-text/5 px-4 py-1.5 rounded-full border border-text/5 uppercase tracking-[0.2em]">{open.length} OPEN · {done.length} DONE</span>
            </div>
            {tasks.length === 0 ? (
                <div className="px-8 py-24 text-center">
                    <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-6">
                        <Check className="w-8 h-8 text-accent" />
                    </div>
                    <p className="text-lg font-semibold text-text/40">No tasks found</p>
                </div>
            ) : (
                <div className="divide-y divide-text/5">
                    {open.map(item => (
                        <div key={item.id} className="flex items-start gap-8 px-10 py-10 hover:bg-text/2 transition-all duration-500 group">
                            <button onClick={() => onComplete(item.id)}
                                className="mt-1.5 w-7 h-7 rounded-2xl border-2 border-text/10 hover:border-accent shrink-0 transition-all duration-500 hover:bg-accent/10 flex items-center justify-center group/btn shadow-sm" >
                                <Check className="w-4 h-4 text-accent opacity-0 group-hover/btn:opacity-100" />
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className="text-lg font-black text-text/80 group-hover:text-text transition-colors tracking-tight leading-relaxed">{item.description}</p>
                                <div className="flex flex-wrap items-center gap-4 mt-3">
                                    {item.workspace_name && (
                                        <Link href={`/workspaces/${item.workspace_id}`}
                                            className="flex items-center gap-1.5 text-xs font-bold text-accent/70 hover:text-accent transition-colors uppercase tracking-widest">
                                            <LayoutDashboard className="w-3.5 h-3.5" />
                                            <span>{item.workspace_name}</span>
                                        </Link>
                                    )}
                                    {item.meeting_title && (
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-text/40">
                                            <Mic className="w-3.5 h-3.5" />
                                            <span className="truncate max-w-[200px]">{item.meeting_title}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-text/40">
                                        <UserIcon className="w-3.5 h-3.5" />
                                        <span>{item.assignee}</span>
                                    </div>
                                    {item.due_date && (
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500/70">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>{item.due_date}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => onNudge(item)} disabled={nudgeLoading === item.id}
                                title="Generate AI nudge"
                                className="shrink-0 w-10 h-10 rounded-2xl border border-text/5 bg-text/2 hover:border-accent/30 hover:bg-accent/5 flex items-center justify-center text-text/40 hover:text-accent transition-all duration-300 disabled:opacity-50">
                                {nudgeLoading === item.id ? <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                            </button>
                        </div>
                    ))}
                    {done.map(item => (
                        <div key={item.id} className="flex items-start gap-6 px-8 py-6 opacity-40 grayscale group hover:grayscale-0 transition-all duration-300">
                            <div className="mt-1 w-6 h-6 rounded-xl bg-accent/20 border border-accent/40 shrink-0 flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 text-accent" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-base font-semibold text-text/60 line-through group-hover:text-text/80 transition-colors">{item.description}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <UserIcon className="w-3.5 h-3.5 text-text/40" />
                                    <span className="text-xs font-medium text-text/40">@{item.assignee}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Meetings Tab ──────────────────────────────────────────────────────────────

export function MeetingsTab({ meetings, activeWs, title, setTitle, file, setFile, uploading, uploadErr, onUpload }: {
    meetings: MeetingListItem[]; activeWs: Workspace | null;
    title: string; setTitle: (v: string) => void; file: File | null; setFile: (v: File | null) => void;
    uploading: boolean; uploadErr: string; onUpload: (e: React.FormEvent) => void;
}) {
    return (
        <div className="space-y-16">
            <div className="glass-card rounded-4xl p-10 shadow-2xl shadow-accent/5">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shadow-lg shadow-accent/5">
                        <Mic className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-text tracking-tighter">New Meeting</h3>
                        <p className="text-[10px] font-black text-accent/50 uppercase tracking-[0.2em] mt-1">INITIALIZE CONTEXT</p>
                    </div>
                </div>
                <UploadForm title={title} setTitle={setTitle} file={file} setFile={setFile}
                    uploading={uploading} uploadErr={uploadErr} onUpload={onUpload} activeWs={activeWs} />
            </div>

            <div className="glass-card rounded-4xl overflow-hidden shadow-2xl">
                <div className="px-10 py-8 border-b border-text/5 flex items-center justify-between bg-text/2">
                    <h3 className="text-xl font-black text-text tracking-tighter">
                        {activeWs ? activeWs.name : "Intelligence Library"}
                    </h3>
                    <span className="text-[10px] font-black text-text/50 bg-text/5 px-4 py-1.5 rounded-full border border-text/5 uppercase tracking-[0.2em]">{meetings.length} TOTAL</span>
                </div>
                <div className="divide-y divide-text/5">
                    {meetings.length === 0 ? (
                        <div className="px-10 py-32 text-center">
                            <Mic className="w-20 h-20 text-text/10 mx-auto mb-8 animate-pulse" />
                            <p className="text-xl font-black text-text/30 tracking-tight">No intelligence collected yet</p>
                            <p className="text-sm font-semibold text-text/20 mt-3 uppercase tracking-widest">Upload context above to begin</p>
                        </div>
                    ) : meetings.map(m => (
                        <Link key={m.id} href={`/meetings/${m.id}`}
                            className="flex items-center justify-between px-10 py-8 hover:bg-text/2 transition-all duration-500 group">
                            <div className="min-w-0 flex-1">
                                <p className="text-lg font-black text-text/80 group-hover:text-accent transition-colors truncate tracking-tight">{m.title}</p>
                                <div className="flex items-center gap-4 mt-3">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-text/20" />
                                        <p className="text-xs font-bold text-text/20 uppercase tracking-widest">
                                            {new Date(m.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="ml-10 shrink-0 flex items-center gap-6">
                                <StatusBadge status={m.status} />
                                <ChevronRight className="w-6 h-6 text-text/20 group-hover:text-accent transition-all duration-500 transform group-hover:translate-x-1" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
