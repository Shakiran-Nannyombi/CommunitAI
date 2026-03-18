"use client";

import Link from "next/link";
import { type Workspace, type MeetingListItem, type GlobalActionItem } from "@/lib/api";

const PROCESSING = new Set(["pending", "processing", "transcribed"]);

const STATUS_COLOR: Record<string, string> = {
    pending: "#facc15", processing: "#60a5fa", transcribed: "#60a5fa",
    complete: "#4ade80", transcription_failed: "#f87171",
    analysis_failed: "#f87171", summarization_failed: "#f87171",
};
const STATUS_LABEL: Record<string, string> = {
    pending: "PEND", processing: "PROC", transcribed: "XSCR", complete: "DONE",
    transcription_failed: "FAIL", analysis_failed: "FAIL", summarization_failed: "FAIL",
};

// ── Upload Form ──────────────────────────────────────────────────────────────

export function UploadForm({ title, setTitle, file, setFile, uploading, uploadErr, onUpload, activeWs }: {
    title: string; setTitle: (v: string) => void;
    file: File | null; setFile: (v: File | null) => void;
    uploading: boolean; uploadErr: string;
    onUpload: (e: React.FormEvent) => void;
    activeWs?: Workspace | null;
}) {
    return (
        <form onSubmit={onUpload} className="space-y-2">
            <div className="flex gap-2 flex-wrap">
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder={`Meeting title${activeWs ? ` · ${activeWs.icon_emoji} ${activeWs.name}` : ""}`}
                    required
                    className="flex-1 min-w-40 bg-black border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-green-700 transition" />
                <label className="cursor-pointer">
                    <span className={`block bg-black border border-zinc-800 rounded px-3 py-1.5 text-xs truncate max-w-48 ${file ? "text-green-400 border-green-900" : "text-zinc-600"}`}>
                        {file ? file.name : "Choose audio…"}
                    </span>
                    <input type="file" accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a"
                        onChange={e => setFile(e.target.files?.[0] ?? null)} className="hidden" required />
                </label>
                <button type="submit" disabled={uploading}
                    className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-widest px-4 py-1.5 rounded transition">
                    {uploading ? "Uploading…" : "Upload & Process"}
                </button>
            </div>
            {uploadErr && <p className="text-red-400 text-xs">{uploadErr}</p>}
        </form>
    );
}

// ── Task Row ─────────────────────────────────────────────────────────────────

export function TaskRow({ item, onComplete, onNudge, nudgeLoading, showMeta = false }: {
    item: GlobalActionItem;
    onComplete: (id: string) => void;
    onNudge: (item: GlobalActionItem) => void;
    nudgeLoading: string | null;
    showMeta?: boolean;
}) {
    return (
        <div className={`flex items-start gap-2 ${item.completed ? "opacity-30" : ""}`}>
            <button onClick={() => !item.completed && onComplete(item.id)}
                className={`mt-0.5 w-3.5 h-3.5 rounded-sm border flex-shrink-0 flex items-center justify-center transition ${item.completed ? "bg-green-700 border-green-700" : "border-zinc-700 hover:border-green-600"
                    }`}>
                {item.completed && <span className="text-black text-[8px] font-bold">✓</span>}
            </button>
            <div className="flex-1 min-w-0">
                <p className={`text-xs text-zinc-300 ${item.completed ? "line-through" : ""}`}>{item.description}</p>
                <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                    {showMeta && item.workspace_name && (
                        <span className="text-xs text-green-700">{item.workspace_emoji} {item.workspace_name}</span>
                    )}
                    {showMeta && <span className="text-xs text-zinc-700">{item.meeting_title}</span>}
                    <span className="text-xs text-zinc-600">@{item.assignee}</span>
                    {item.due_date && <span className="text-xs text-yellow-700">due {item.due_date}</span>}
                </div>
            </div>
            {!item.completed && (
                <button onClick={() => onNudge(item)} disabled={nudgeLoading === item.id}
                    title="Generate AI nudge"
                    className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded border border-zinc-800 hover:border-green-800 text-zinc-600 hover:text-green-500 transition disabled:opacity-50">
                    {nudgeLoading === item.id ? "…" : "💬"}
                </button>
            )}
        </div>
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
    const recentMeetings = meetings.slice(0, 8);
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full">
            {/* Left column */}
            <div className="space-y-3">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { label: "COMMUNITIES", value: workspaces.length, color: "text-green-400" },
                        { label: "OPEN TASKS", value: pendingTasks.length, color: "text-yellow-400" },
                        { label: "MEETINGS", value: meetings.length, color: "text-blue-400" },
                    ].map(s => (
                        <div key={s.label} className="panel rounded p-3">
                            <p className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-zinc-700 uppercase tracking-widest mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Lead's Inbox — recent meetings */}
                <div className="panel rounded">
                    <div className="panel-header">
                        <span className="text-xs text-zinc-500 uppercase tracking-widest">Lead&apos;s Inbox</span>
                        <span className="text-xs text-zinc-700">{meetings.filter(m => m.status === "complete").length} ready</span>
                    </div>
                    <div className="divide-y divide-zinc-900">
                        {recentMeetings.length === 0 ? (
                            <p className="text-xs text-zinc-700 p-3">No meetings yet.</p>
                        ) : recentMeetings.map(m => (
                            <Link key={m.id} href={`/meetings/${m.id}`}
                                className="flex items-center justify-between px-3 py-2 hover:bg-zinc-950 transition group">
                                <div className="min-w-0">
                                    <p className="text-xs text-zinc-400 group-hover:text-green-400 transition truncate">{m.title}</p>
                                    <p className="text-xs text-zinc-700">{new Date(m.created_at).toLocaleDateString()}</p>
                                </div>
                                <span className="text-xs ml-2 flex-shrink-0 flex items-center gap-1" style={{ color: STATUS_COLOR[m.status] ?? "#71717a" }}>
                                    {PROCESSING.has(m.status) && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: STATUS_COLOR[m.status] }} />}
                                    {STATUS_LABEL[m.status] ?? m.status}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Upload */}
                <div className="panel rounded p-3">
                    <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">🎙 New Recording</p>
                    <UploadForm title={title} setTitle={setTitle} file={file} setFile={setFile}
                        uploading={uploading} uploadErr={uploadErr} onUpload={onUpload} activeWs={activeWs} />
                </div>
            </div>

            {/* Right column — action items table */}
            <div className="panel rounded flex flex-col min-h-0">
                <div className="panel-header flex-shrink-0">
                    <span className="text-xs text-zinc-500 uppercase tracking-widest">Unified Action Items</span>
                    <span className="text-xs text-zinc-700">{pendingTasks.length} open</span>
                </div>
                {/* Table header */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-1.5 border-b border-zinc-900 text-xs text-zinc-700 uppercase tracking-widest flex-shrink-0">
                    <span>Task</span><span>Source</span><span>Assignee</span><span>Action</span>
                </div>
                <div className="flex-1 overflow-auto divide-y divide-zinc-900">
                    {pendingTasks.length === 0 ? (
                        <p className="text-xs text-zinc-700 p-3">All clear ✓</p>
                    ) : pendingTasks.map(item => (
                        <div key={item.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 items-center tr-hover">
                            <p className="text-xs text-zinc-400 truncate">{item.description}</p>
                            <span className="text-xs text-zinc-700 truncate max-w-24">{item.workspace_emoji} {item.workspace_name ?? "—"}</span>
                            <span className="text-xs text-zinc-600">@{item.assignee}</span>
                            <div className="flex gap-1">
                                <button onClick={() => onComplete(item.id)}
                                    className="text-xs px-1.5 py-0.5 rounded border border-zinc-800 hover:border-green-800 text-zinc-600 hover:text-green-500 transition">✓</button>
                                <button onClick={() => onNudge(item)} disabled={nudgeLoading === item.id}
                                    className="text-xs px-1.5 py-0.5 rounded border border-zinc-800 hover:border-green-800 text-zinc-600 hover:text-green-500 transition disabled:opacity-50">
                                    {nudgeLoading === item.id ? "…" : "💬"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Tasks Tab ─────────────────────────────────────────────────────────────────

export function TasksTab({ tasks, activeWs, onComplete, onNudge, nudgeLoading }: {
    tasks: GlobalActionItem[]; activeWs: Workspace | null;
    onComplete: (id: string) => void; onNudge: (item: GlobalActionItem) => void; nudgeLoading: string | null;
}) {
    return (
        <div className="panel rounded">
            <div className="panel-header">
                <span className="text-xs text-zinc-500 uppercase tracking-widest">
                    Master Task List {activeWs ? `· ${activeWs.icon_emoji} ${activeWs.name}` : "· All Communities"}
                </span>
                <span className="text-xs text-zinc-700">{tasks.filter(t => !t.completed).length} open / {tasks.length} total</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-3 py-1.5 border-b border-zinc-900 text-xs text-zinc-700 uppercase tracking-widest">
                <span>Task</span><span>Community</span><span>Meeting</span><span>Assignee</span><span>Action</span>
            </div>
            <div className="divide-y divide-zinc-900">
                {tasks.length === 0 ? (
                    <p className="text-xs text-zinc-700 p-3">No tasks found.</p>
                ) : tasks.map(item => (
                    <div key={item.id} className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-3 py-2 items-center tr-hover ${item.completed ? "opacity-30" : ""}`}>
                        <p className={`text-xs text-zinc-400 truncate ${item.completed ? "line-through" : ""}`}>{item.description}</p>
                        <span className="text-xs text-green-800 truncate max-w-20">{item.workspace_emoji} {item.workspace_name ?? "—"}</span>
                        <span className="text-xs text-zinc-700 truncate max-w-24">{item.meeting_title}</span>
                        <span className="text-xs text-zinc-600">@{item.assignee}</span>
                        <div className="flex gap-1">
                            {!item.completed && <>
                                <button onClick={() => onComplete(item.id)}
                                    className="text-xs px-1.5 py-0.5 rounded border border-zinc-800 hover:border-green-800 text-zinc-600 hover:text-green-500 transition">✓</button>
                                <button onClick={() => onNudge(item)} disabled={nudgeLoading === item.id}
                                    className="text-xs px-1.5 py-0.5 rounded border border-zinc-800 hover:border-green-800 text-zinc-600 hover:text-green-500 transition disabled:opacity-50">
                                    {nudgeLoading === item.id ? "…" : "💬"}
                                </button>
                            </>}
                        </div>
                    </div>
                ))}
            </div>
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
        <div className="space-y-3">
            <div className="panel rounded p-3">
                <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2">🎙 Upload Recording</p>
                <UploadForm title={title} setTitle={setTitle} file={file} setFile={setFile}
                    uploading={uploading} uploadErr={uploadErr} onUpload={onUpload} activeWs={activeWs} />
            </div>
            <div className="panel rounded">
                <div className="panel-header">
                    <span className="text-xs text-zinc-500 uppercase tracking-widest">
                        {activeWs ? `${activeWs.icon_emoji} ${activeWs.name}` : "All Meetings"}
                    </span>
                    <span className="text-xs text-zinc-700">{meetings.length} total</span>
                </div>
                <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-1.5 border-b border-zinc-900 text-xs text-zinc-700 uppercase tracking-widest">
                    <span>Title</span><span>Date</span><span>Status</span>
                </div>
                <div className="divide-y divide-zinc-900">
                    {meetings.length === 0 ? (
                        <p className="text-xs text-zinc-700 p-3">No meetings yet.</p>
                    ) : meetings.map(m => (
                        <Link key={m.id} href={`/meetings/${m.id}`}
                            className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 items-center tr-hover group">
                            <p className="text-xs text-zinc-400 group-hover:text-green-400 transition truncate">{m.title}</p>
                            <span className="text-xs text-zinc-700 tabular-nums">{new Date(m.created_at).toLocaleDateString()}</span>
                            <span className="text-xs flex items-center gap-1" style={{ color: STATUS_COLOR[m.status] ?? "#71717a" }}>
                                {PROCESSING.has(m.status) && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: STATUS_COLOR[m.status] }} />}
                                {STATUS_LABEL[m.status] ?? m.status}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
