"use client";

import Link from "next/link";
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
    User,
    Check
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
    return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
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
                    <input type="file" accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a"
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
    const recentMeetings = meetings.slice(0, 6);
    const completedCount = meetings.filter(m => m.status === "complete").length;

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-5">
                {[
                    { label: "Workspaces", value: workspaces.length, icon: LayoutDashboard, color: "text-accent", bg: "bg-accent/10", border: "border-accent/20", sub: "active" },
                    { label: "Open Tasks", value: pendingTasks.length, icon: CheckSquare, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", sub: "pending" },
                    { label: "Meetings", value: completedCount, icon: Mic, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", sub: "completed" },
                ].map(s => (
                    <div key={s.label} className="bg-text/5 border border-text/5 rounded-2xl p-5 shadow-sm group hover:border-text/10 transition-all duration-300">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className={`text-3xl font-bold tabular-nums tracking-tight ${s.color}`}>{s.value}</p>
                                <p className="text-[11px] font-bold text-text/50 mt-1 uppercase tracking-wider">{s.label}</p>
                            </div>
                            <div className={`p-2.5 rounded-xl ${s.bg} ${s.border} border shadow-inner transition-transform duration-300 group-hover:scale-110`}>
                                <s.icon className={`w-5 h-5 ${s.color}`} />
                            </div>
                        </div>
                        <p className="text-[10px] text-text/40 mt-4 font-medium uppercase tracking-widest">{s.sub}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Meetings */}
                <div className="bg-background border border-text/5 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                    <div className="px-8 py-6 border-b border-text/5 flex items-center justify-between bg-text/2">
                        <h3 className="text-base font-bold text-text tracking-tight">Recent Meetings</h3>
                        <span className="text-[10px] font-bold text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent/20 uppercase tracking-widest">{completedCount} READY</span>
                    </div>
                    <div className="divide-y divide-text/5">
                        {recentMeetings.length === 0 ? (
                            <div className="px-8 py-20 text-center">
                                <Mic className="w-10 h-10 text-text/20 mx-auto mb-4" />
                                <p className="text-base font-semibold text-text/40">No meetings yet</p>
                                <p className="text-sm text-text/30 mt-2">Upload a recording to get started</p>
                            </div>
                        ) : recentMeetings.map(m => (
                            <Link key={m.id} href={`/meetings/${m.id}`}
                                className="flex items-center justify-between px-8 py-6 hover:bg-text/3 transition-all duration-300 group">
                                <div className="min-w-0 flex-1">
                                    <p className="text-base font-semibold text-text/80 group-hover:text-accent transition-colors truncate">{m.title}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <Calendar className="w-3.5 h-3.5 text-text/30" />
                                        <p className="text-xs font-medium text-text/30">
                                            {new Date(m.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                        </p>
                                    </div>
                                </div>
                                <div className="ml-6 shrink-0 flex items-center gap-3">
                                    <StatusBadge status={m.status} />
                                    <ChevronRight className="w-5 h-5 text-text/40 group-hover:text-text/60 transition-colors" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Open Tasks */}
                <div className="bg-background border border-text/5 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                    <div className="px-8 py-6 border-b border-text/5 flex items-center justify-between bg-white/2">
                        <h3 className="text-base font-bold text-text tracking-tight">Open Tasks</h3>
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 uppercase tracking-widest">{pendingTasks.length} PENDING</span>
                    </div>
                    <div className="divide-y divide-text/5 max-h-[520px] overflow-y-auto">
                        {pendingTasks.length === 0 ? (
                            <div className="px-8 py-20 text-center">
                                <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                                    <Check className="w-6 h-6 text-accent" />
                                </div>
                                <p className="text-base font-semibold text-text/40">All caught up!</p>
                            </div>
                        ) : pendingTasks.slice(0, 8).map(item => (
                            <div key={item.id} className="flex items-start gap-5 px-8 py-6 hover:bg-text/3 transition-all duration-300 group">
                                <button onClick={() => onComplete(item.id)}
                                    className="mt-1 w-6 h-6 rounded-xl border-2 border-text/10 hover:border-accent shrink-0 transition-all duration-300 hover:bg-accent/10 flex items-center justify-center group/btn" >
                                    <Check className="w-3.5 h-3.5 text-accent opacity-0 group-hover/btn:opacity-100" />
                                </button>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-semibold text-text/80 group-hover:text-text transition-colors tracking-tight leading-relaxed">{item.description}</p>
                                    <div className="flex flex-wrap items-center gap-4 mt-3">
                                        {item.workspace_name && (
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-accent/70 uppercase tracking-widest">
                                                <LayoutDashboard className="w-3.5 h-3.5" />
                                                <span>{item.workspace_name}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-text/40">
                                            <User className="w-3.5 h-3.5" />
                                            <span>{item.assignee}</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => onNudge(item)} disabled={nudgeLoading === item.id}
                                    title="Generate AI nudge"
                                    className="shrink-0 w-10 h-10 rounded-2xl border border-text/5 bg-text/2 hover:border-accent/30 hover:bg-accent/5 flex items-center justify-center text-text/40 hover:text-accent transition-all duration-300 disabled:opacity-50">
                                    {nudgeLoading === item.id ? <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Workspaces */}
            <div>
                <h3 className="text-sm font-bold text-text/80 mb-4 uppercase tracking-widest ml-1">Your Workspaces</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {workspaces.map(ws => (
                        <Link key={ws.id} href={`/workspaces/${ws.id}`}
                            className="bg-background border border-text/5 rounded-2xl p-5 hover:border-accent/20 hover:bg-accent/2 transition-all duration-300 group shadow-sm">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-text/5 flex items-center justify-center transition-all duration-300 group-hover:bg-accent/10 group-hover:scale-110">
                                    <LayoutDashboard className="w-6 h-6 text-text/40 group-hover:text-accent" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-text group-hover:text-text transition-colors truncate">{ws.name}</p>
                                    <p className="text-[10px] font-bold text-text/40 uppercase tracking-widest mt-0.5">WORKSPACE</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-[11px] font-bold text-text/50 group-hover:text-accent transition-colors">GO TO WORKSPACE</p>
                                <ChevronRight className="w-4 h-4 text-text/20 group-hover:text-accent transition-colors" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Upload */}
            <div className="bg-background border border-accent/10 rounded-2xl p-6 shadow-xl shadow-accent/5">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                        <Mic className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-text tracking-tight">Quick Upload</h3>
                        <p className="text-[10px] font-bold text-text/40 uppercase tracking-widest mt-0.5">TRANSCRIPTION & ANALYSIS</p>
                    </div>
                </div>
                <UploadForm title={title} setTitle={setTitle} file={file} setFile={setFile}
                    uploading={uploading} uploadErr={uploadErr} onUpload={onUpload} activeWs={activeWs} />
            </div>
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
        <div className="bg-background border border-text/5 rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div className="px-8 py-6 border-b border-text/5 flex items-center justify-between bg-text/2">
                <h3 className="text-base font-bold text-text tracking-tight">
                    {activeWs ? activeWs.name : "All Tasks"}
                </h3>
                <span className="text-[10px] font-bold text-text/50 bg-text/5 px-3 py-1 rounded-full border border-text/5 uppercase tracking-widest">{open.length} OPEN · {done.length} DONE</span>
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
                        <div key={item.id} className="flex items-start gap-6 px-8 py-7 hover:bg-text/3 transition-all duration-300 group">
                            <button onClick={() => onComplete(item.id)}
                                className="mt-1 w-6 h-6 rounded-xl border-2 border-text/10 hover:border-accent shrink-0 transition-all duration-300 hover:bg-accent/10 flex items-center justify-center group/btn" >
                                <Check className="w-3.5 h-3.5 text-accent opacity-0 group-hover/btn:opacity-100" />
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className="text-base font-semibold text-text/80 group-hover:text-text transition-colors tracking-tight leading-relaxed">{item.description}</p>
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
                                        <User className="w-3.5 h-3.5" />
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
                                    <User className="w-3.5 h-3.5 text-text/40" />
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
        <div className="space-y-10">
            <div className="bg-background border border-accent/10 rounded-2xl p-8 shadow-xl shadow-accent/5">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                        <Mic className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-text tracking-tight">New Meeting</h3>
                        <p className="text-[10px] font-bold text-text/40 uppercase tracking-widest mt-1">UPLOAD RECORDING</p>
                    </div>
                </div>
                <UploadForm title={title} setTitle={setTitle} file={file} setFile={setFile}
                    uploading={uploading} uploadErr={uploadErr} onUpload={onUpload} activeWs={activeWs} />
            </div>

            <div className="bg-background border border-text/5 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="px-8 py-6 border-b border-text/5 flex items-center justify-between bg-text/2">
                    <h3 className="text-base font-bold text-text tracking-tight">
                        {activeWs ? activeWs.name : "All Meetings"}
                    </h3>
                    <span className="text-[10px] font-bold text-text/50 bg-text/5 px-3 py-1 rounded-full border border-text/5 uppercase tracking-widest">{meetings.length} TOTAL</span>
                </div>
                <div className="divide-y divide-text/5">
                    {meetings.length === 0 ? (
                        <div className="px-8 py-24 text-center">
                            <Mic className="w-16 h-16 text-text/20 mx-auto mb-6" />
                            <p className="text-lg font-semibold text-text/40">No meetings yet</p>
                            <p className="text-sm text-text/30 mt-2">Upload a recording above to get started</p>
                        </div>
                    ) : meetings.map(m => (
                        <Link key={m.id} href={`/meetings/${m.id}`}
                            className="flex items-center justify-between px-8 py-6 hover:bg-text/3 transition-all duration-300 group">
                            <div className="min-w-0 flex-1">
                                <p className="text-base font-semibold text-text/80 group-hover:text-accent transition-colors truncate">{m.title}</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <Calendar className="w-3.5 h-3.5 text-text/30" />
                                    <p className="text-xs font-medium text-text/30">
                                        {new Date(m.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                    </p>
                                </div>
                            </div>
                            <div className="ml-6 shrink-0 flex items-center gap-3">
                                <StatusBadge status={m.status} />
                                <ChevronRight className="w-5 h-5 text-text/40 group-hover:text-text/60 transition-colors" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
