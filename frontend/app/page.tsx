"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
    getWorkspaces, createWorkspace, getMeetings, createMeeting, uploadAudio,
    getGlobalTasks, completeActionItem, generateNudge,
    type Workspace, type MeetingListItem, type GlobalActionItem,
} from "@/lib/api";

const USER_ID = "user-123";

const STATUS_COLOR: Record<string, string> = {
    pending: "text-yellow-400 bg-yellow-400/10 border-yellow-800",
    processing: "text-blue-400 bg-blue-400/10 border-blue-800",
    transcribed: "text-blue-400 bg-blue-400/10 border-blue-800",
    complete: "text-green-400 bg-green-400/10 border-green-800",
    transcription_failed: "text-red-400 bg-red-400/10 border-red-800",
    analysis_failed: "text-red-400 bg-red-400/10 border-red-800",
    summarization_failed: "text-red-400 bg-red-400/10 border-red-800",
};

const PROCESSING = new Set(["pending", "processing", "transcribed"]);

type Tab = "overview" | "tasks" | "meetings";

export default function CommandCentre() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [activeWs, setActiveWs] = useState<Workspace | null>(null);
    const [tab, setTab] = useState<Tab>("overview");
    const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
    const [tasks, setTasks] = useState<GlobalActionItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Upload form
    const [title, setTitle] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadErr, setUploadErr] = useState("");

    // New workspace form
    const [wsName, setWsName] = useState("");
    const [wsEmoji, setWsEmoji] = useState("🏘️");
    const [showWsForm, setShowWsForm] = useState(false);

    // Nudge modal
    const [nudgeMsg, setNudgeMsg] = useState("");
    const [nudgeLoading, setNudgeLoading] = useState<string | null>(null);

    const loadAll = useCallback(async () => {
        const [ws, t] = await Promise.all([
            getWorkspaces(USER_ID),
            getGlobalTasks(USER_ID),
        ]);
        setWorkspaces(ws);
        setTasks(t);
        setLoading(false);
    }, []);

    const loadMeetings = useCallback(async () => {
        const data = await getMeetings(USER_ID, activeWs?.id);
        setMeetings(data);
    }, [activeWs]);

    useEffect(() => { loadAll(); }, [loadAll]);
    useEffect(() => { loadMeetings(); }, [loadMeetings]);

    // Poll processing meetings
    useEffect(() => {
        const hasProcessing = meetings.some(m => PROCESSING.has(m.status));
        if (!hasProcessing) return;
        const t = setInterval(loadMeetings, 4000);
        return () => clearInterval(t);
    }, [meetings, loadMeetings]);

    async function handleUpload(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !file) return;
        setUploading(true);
        setUploadErr("");
        try {
            const m = await createMeeting(title.trim(), USER_ID, activeWs?.id);
            await uploadAudio(m.id, file);
            setTitle("");
            setFile(null);
            await loadMeetings();
            setTab("meetings");
        } catch {
            setUploadErr("Upload failed. Check backend is running.");
        } finally {
            setUploading(false);
        }
    }

    async function handleCreateWs(e: React.FormEvent) {
        e.preventDefault();
        if (!wsName.trim()) return;
        await createWorkspace(wsName.trim(), wsEmoji, USER_ID);
        setWsName("");
        setWsEmoji("🏘️");
        setShowWsForm(false);
        await loadAll();
    }

    async function handleComplete(id: string) {
        await completeActionItem(id);
        await Promise.all([loadAll(), loadMeetings()]);
    }

    async function handleNudge(item: GlobalActionItem) {
        setNudgeLoading(item.id);
        try {
            const msg = await generateNudge(item.id);
            setNudgeMsg(msg);
        } finally {
            setNudgeLoading(null);
        }
    }

    const pendingTasks = tasks.filter(t => !t.completed);
    const recentMeetings = meetings.slice(0, 5);
    const filteredTasks = activeWs
        ? tasks.filter(t => t.workspace_id === activeWs.id)
        : tasks;

    return (
        <div className="flex min-h-screen w-full bg-black text-white font-mono">
            {/* ── Workspace Sidebar ── */}
            <aside className="w-16 flex-shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col items-center py-4 gap-3">
                {/* All workspaces */}
                <button
                    onClick={() => { setActiveWs(null); setTab("overview"); }}
                    title="All Communities"
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition border ${activeWs === null
                            ? "bg-green-500/20 border-green-500 text-green-400"
                            : "border-zinc-700 hover:border-green-700 text-zinc-400 hover:text-white"
                        }`}
                >
                    ⚡
                </button>

                <div className="w-8 border-t border-zinc-800" />

                {workspaces.map(ws => (
                    <button
                        key={ws.id}
                        onClick={() => { setActiveWs(ws); setTab("meetings"); }}
                        title={ws.name}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition border ${activeWs?.id === ws.id
                                ? "bg-green-500/20 border-green-500"
                                : "border-zinc-700 hover:border-green-700 text-zinc-400 hover:text-white"
                            }`}
                    >
                        {ws.icon_emoji}
                    </button>
                ))}

                <button
                    onClick={() => setShowWsForm(v => !v)}
                    title="New Community"
                    className="w-10 h-10 rounded-xl border border-dashed border-zinc-700 hover:border-green-600 flex items-center justify-center text-zinc-500 hover:text-green-400 transition text-xl"
                >
                    +
                </button>
            </aside>

            {/* ── Main Panel ── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <header className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-green-400 font-bold text-base tracking-widest uppercase">CommunitAI</span>
                        {activeWs && (
                            <>
                                <span className="text-zinc-600">/</span>
                                <span className="text-zinc-300 text-sm">{activeWs.icon_emoji} {activeWs.name}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-zinc-600">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                        LIVE
                    </div>
                </header>

                {/* Tabs */}
                <nav className="border-b border-zinc-800 px-6 flex gap-0 flex-shrink-0">
                    {(["overview", "tasks", "meetings"] as Tab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-2.5 text-xs uppercase tracking-widest border-b-2 transition ${tab === t
                                    ? "border-green-500 text-green-400"
                                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                                }`}
                        >
                            {t === "overview" ? "⚡ Overview" : t === "tasks" ? "✓ Tasks" : "🎙 Meetings"}
                        </button>
                    ))}
                </nav>

                <main className="flex-1 overflow-auto p-6">
                    {loading ? (
                        <p className="text-zinc-600 text-sm">Loading…</p>
                    ) : (
                        <>
                            {/* ── OVERVIEW TAB ── */}
                            {tab === "overview" && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {/* Stats row */}
                                    <div className="lg:col-span-2 grid grid-cols-3 gap-3">
                                        {[
                                            { label: "Communities", value: workspaces.length, color: "text-green-400" },
                                            { label: "Open Tasks", value: pendingTasks.length, color: "text-yellow-400" },
                                            { label: "Meetings", value: meetings.length, color: "text-blue-400" },
                                        ].map(s => (
                                            <div key={s.label} className="bg-zinc-950 border border-zinc-800 rounded p-4">
                                                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                                <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">{s.label}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Recent meetings */}
                                    <div className="bg-zinc-950 border border-zinc-800 rounded p-4">
                                        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Recent Activity</p>
                                        {recentMeetings.length === 0 ? (
                                            <p className="text-zinc-600 text-xs">No meetings yet.</p>
                                        ) : (
                                            <ul className="space-y-2">
                                                {recentMeetings.map(m => (
                                                    <li key={m.id}>
                                                        <Link href={`/meetings/${m.id}`} className="flex items-center justify-between hover:bg-zinc-900 rounded px-2 py-1.5 transition group">
                                                            <div className="min-w-0">
                                                                <p className="text-sm text-white truncate group-hover:text-green-400 transition">{m.title}</p>
                                                                <p className="text-xs text-zinc-600">{new Date(m.created_at).toLocaleDateString()}</p>
                                                            </div>
                                                            <span className={`text-xs px-2 py-0.5 rounded border ml-2 flex-shrink-0 ${STATUS_COLOR[m.status] ?? "text-zinc-400 border-zinc-700"}`}>
                                                                {PROCESSING.has(m.status) ? (
                                                                    <span className="flex items-center gap-1">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                                                        {m.status}
                                                                    </span>
                                                                ) : m.status.replace(/_/g, " ")}
                                                            </span>
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    {/* Urgent tasks */}
                                    <div className="bg-zinc-950 border border-zinc-800 rounded p-4">
                                        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Urgent Tasks</p>
                                        {pendingTasks.length === 0 ? (
                                            <p className="text-zinc-600 text-xs">All clear ✓</p>
                                        ) : (
                                            <ul className="space-y-2">
                                                {pendingTasks.slice(0, 6).map(item => (
                                                    <TaskRow key={item.id} item={item} onComplete={handleComplete} onNudge={handleNudge} nudgeLoading={nudgeLoading} />
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    {/* Upload card */}
                                    <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded p-4">
                                        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
                                            🎙 New Recording {activeWs ? `→ ${activeWs.icon_emoji} ${activeWs.name}` : ""}
                                        </p>
                                        <UploadForm
                                            title={title} setTitle={setTitle}
                                            file={file} setFile={setFile}
                                            uploading={uploading} error={uploadErr}
                                            onSubmit={handleUpload}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ── TASKS TAB ── */}
                            {tab === "tasks" && (
                                <div className="bg-zinc-950 border border-zinc-800 rounded">
                                    <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                                        <p className="text-xs text-zinc-500 uppercase tracking-widest">
                                            Master Task List {activeWs ? `· ${activeWs.icon_emoji} ${activeWs.name}` : "· All Communities"}
                                        </p>
                                        <span className="text-xs text-zinc-600">{filteredTasks.filter(t => !t.completed).length} open</span>
                                    </div>
                                    {filteredTasks.length === 0 ? (
                                        <p className="text-zinc-600 text-xs p-4">No tasks found.</p>
                                    ) : (
                                        <ul className="divide-y divide-zinc-800/50">
                                            {filteredTasks.map(item => (
                                                <li key={item.id} className="px-4 py-3">
                                                    <TaskRow item={item} onComplete={handleComplete} onNudge={handleNudge} nudgeLoading={nudgeLoading} showMeta />
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            {/* ── MEETINGS TAB ── */}
                            {tab === "meetings" && (
                                <div className="space-y-4">
                                    <div className="bg-zinc-950 border border-zinc-800 rounded p-4">
                                        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
                                            🎙 Upload Recording {activeWs ? `→ ${activeWs.icon_emoji} ${activeWs.name}` : ""}
                                        </p>
                                        <UploadForm
                                            title={title} setTitle={setTitle}
                                            file={file} setFile={setFile}
                                            uploading={uploading} error={uploadErr}
                                            onSubmit={handleUpload}
                                        />
                                    </div>

                                    <div className="bg-zinc-950 border border-zinc-800 rounded">
                                        <div className="px-4 py-3 border-b border-zinc-800">
                                            <p className="text-xs text-zinc-500 uppercase tracking-widest">
                                                {activeWs ? `${activeWs.icon_emoji} ${activeWs.name}` : "All Meetings"}
                                            </p>
                                        </div>
                                        {meetings.length === 0 ? (
                                            <p className="text-zinc-600 text-xs p-4">No meetings yet.</p>
                                        ) : (
                                            <ul className="divide-y divide-zinc-800/50">
                                                {meetings.map(m => (
                                                    <li key={m.id}>
                                                        <Link href={`/meetings/${m.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-900 transition group">
                                                            <div className="min-w-0">
                                                                <p className="text-sm text-white group-hover:text-green-400 transition truncate">{m.title}</p>
                                                                <p className="text-xs text-zinc-600 mt-0.5">{new Date(m.created_at).toLocaleString()}</p>
                                                            </div>
                                                            <span className={`text-xs px-2 py-0.5 rounded border ml-3 flex-shrink-0 ${STATUS_COLOR[m.status] ?? "text-zinc-400 border-zinc-700"}`}>
                                                                {PROCESSING.has(m.status) ? (
                                                                    <span className="flex items-center gap-1">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                                                        {m.status}
                                                                    </span>
                                                                ) : m.status.replace(/_/g, " ")}
                                                            </span>
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>

            {/* ── New Workspace Form (floating) ── */}
            {showWsForm && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowWsForm(false)}>
                    <form
                        onSubmit={handleCreateWs}
                        onClick={e => e.stopPropagation()}
                        className="bg-zinc-950 border border-zinc-700 rounded-lg p-6 w-80 space-y-4"
                    >
                        <p className="text-sm font-semibold text-white uppercase tracking-widest">New Community</p>
                        <div className="flex gap-2">
                            <input
                                value={wsEmoji}
                                onChange={e => setWsEmoji(e.target.value)}
                                className="w-14 bg-zinc-900 border border-zinc-700 rounded px-2 py-2 text-center text-lg focus:outline-none focus:border-green-600"
                                maxLength={2}
                            />
                            <input
                                value={wsName}
                                onChange={e => setWsName(e.target.value)}
                                placeholder="Community name"
                                className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-600"
                                required
                            />
                        </div>
                        <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white text-sm font-semibold py-2 rounded transition">
                            Create
                        </button>
                    </form>
                </div>
            )}

            {/* ── Nudge Modal ── */}
            {nudgeMsg && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setNudgeMsg("")}>
                    <div
                        onClick={e => e.stopPropagation()}
                        className="bg-zinc-950 border border-green-800 rounded-lg p-6 w-96 space-y-4"
                    >
                        <p className="text-xs text-green-400 uppercase tracking-widest">Generated Nudge</p>
                        <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{nudgeMsg}</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { navigator.clipboard.writeText(nudgeMsg); }}
                                className="flex-1 bg-green-700 hover:bg-green-600 text-white text-xs py-2 rounded transition"
                            >
                                Copy to Clipboard
                            </button>
                            <button
                                onClick={() => setNudgeMsg("")}
                                className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-2 rounded transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Sub-components ──

function UploadForm({
    title, setTitle, file, setFile, uploading, error, onSubmit,
}: {
    title: string; setTitle: (v: string) => void;
    file: File | null; setFile: (v: File | null) => void;
    uploading: boolean; error: string;
    onSubmit: (e: React.FormEvent) => void;
}) {
    return (
        <form onSubmit={onSubmit} className="flex flex-wrap gap-3 items-end">
            <input
                type="text"
                placeholder="Meeting title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="flex-1 min-w-40 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-600"
                required
            />
            <label className="flex-1 min-w-40 cursor-pointer">
                <span className={`block bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm truncate ${file ? "text-green-400" : "text-zinc-600"}`}>
                    {file ? file.name : "Choose audio file…"}
                </span>
                <input
                    type="file"
                    accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a"
                    onChange={e => setFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                    required
                />
            </label>
            {error && <p className="w-full text-red-400 text-xs">{error}</p>}
            <button
                type="submit"
                disabled={uploading}
                className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded transition"
            >
                {uploading ? "Uploading…" : "Upload & Process"}
            </button>
        </form>
    );
}

function TaskRow({
    item, onComplete, onNudge, nudgeLoading, showMeta = false,
}: {
    item: GlobalActionItem;
    onComplete: (id: string) => void;
    onNudge: (item: GlobalActionItem) => void;
    nudgeLoading: string | null;
    showMeta?: boolean;
}) {
    return (
        <div className={`flex items-start gap-3 ${item.completed ? "opacity-40" : ""}`}>
            <button
                onClick={() => !item.completed && onComplete(item.id)}
                className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition ${item.completed ? "bg-green-600 border-green-600" : "border-zinc-600 hover:border-green-500"
                    }`}
            >
                {item.completed && <span className="text-white text-[10px]">✓</span>}
            </button>
            <div className="flex-1 min-w-0">
                <p className={`text-sm text-white ${item.completed ? "line-through" : ""}`}>{item.description}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                    {showMeta && item.workspace_name && (
                        <span className="text-xs text-green-600">{item.workspace_emoji} {item.workspace_name}</span>
                    )}
                    {showMeta && (
                        <span className="text-xs text-zinc-600">{item.meeting_title}</span>
                    )}
                    <span className="text-xs text-zinc-500">@{item.assignee}</span>
                    {item.due_date && (
                        <span className="text-xs text-yellow-600">due {item.due_date}</span>
                    )}
                </div>
            </div>
            {!item.completed && (
                <button
                    onClick={() => onNudge(item)}
                    disabled={nudgeLoading === item.id}
                    title="Generate follow-up nudge"
                    className="flex-shrink-0 text-xs px-2 py-1 rounded border border-zinc-700 hover:border-green-600 text-zinc-500 hover:text-green-400 transition disabled:opacity-50"
                >
                    {nudgeLoading === item.id ? "…" : "💬"}
                </button>
            )}
        </div>
    );
}
