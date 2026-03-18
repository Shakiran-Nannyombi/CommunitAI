"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    getWorkspaces, createWorkspace, getMeetings, createMeeting, uploadAudio,
    getGlobalTasks, completeActionItem, generateNudge, clearAuth, loadAuth,
    type Workspace, type GlobalActionItem, type AuthUser,
} from "@/lib/api";
import { OverviewTab, TasksTab, MeetingsTab } from "./_components";

const PROCESSING = new Set(["pending", "processing", "transcribed"]);

type Tab = "overview" | "tasks" | "meetings";

export default function CommandCentre() {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [activeWs, setActiveWs] = useState<Workspace | null>(null);
    const [tab, setTab] = useState<Tab>("overview");
    const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
    const [tasks, setTasks] = useState<GlobalActionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [clock, setClock] = useState("");

    // Upload form
    const [title, setTitle] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadErr, setUploadErr] = useState("");

    // Workspace form
    const [wsName, setWsName] = useState("");
    const [wsEmoji, setWsEmoji] = useState("🏘️");
    const [showWsForm, setShowWsForm] = useState(false);

    // Nudge modal
    const [nudgeMsg, setNudgeMsg] = useState("");
    const [nudgeLoading, setNudgeLoading] = useState<string | null>(null);

    // Auth check on mount
    useEffect(() => {
        const auth = loadAuth();
        if (!auth) { router.replace("/login"); return; }
        setUser(auth);
    }, [router]);

    // Live clock
    useEffect(() => {
        const tick = () => setClock(new Date().toLocaleTimeString("en-US", { hour12: false }));
        tick();
        const t = setInterval(tick, 1000);
        return () => clearInterval(t);
    }, []);

    const loadAll = useCallback(async (uid: string) => {
        const [ws, t] = await Promise.all([getWorkspaces(uid), getGlobalTasks(uid)]);
        setWorkspaces(ws);
        setTasks(t);
        setLoading(false);
    }, []);

    const loadMeetings = useCallback(async (uid: string, wsId?: string) => {
        const data = await getMeetings(uid, wsId);
        setMeetings(data);
    }, []);

    useEffect(() => {
        if (!user) return;
        loadAll(user.user_id);
    }, [user, loadAll]);

    useEffect(() => {
        if (!user) return;
        loadMeetings(user.user_id, activeWs?.id);
    }, [user, activeWs, loadMeetings]);

    // Poll processing meetings
    useEffect(() => {
        if (!user) return;
        const hasProcessing = meetings.some(m => PROCESSING.has(m.status));
        if (!hasProcessing) return;
        const t = setInterval(() => loadMeetings(user.user_id, activeWs?.id), 4000);
        return () => clearInterval(t);
    }, [meetings, user, activeWs, loadMeetings]);

    function handleLogout() {
        clearAuth();
        router.push("/login");
    }

    async function handleUpload(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !file || !user) return;
        setUploading(true); setUploadErr("");
        try {
            const m = await createMeeting(title.trim(), user.user_id, activeWs?.id);
            await uploadAudio(m.id, file);
            setTitle(""); setFile(null);
            await Promise.all([loadMeetings(user.user_id, activeWs?.id), loadAll(user.user_id)]);
            setTab("meetings");
        } catch { setUploadErr("Upload failed — is the backend running?"); }
        finally { setUploading(false); }
    }

    async function handleCreateWs(e: React.FormEvent) {
        e.preventDefault();
        if (!wsName.trim() || !user) return;
        await createWorkspace(wsName.trim(), wsEmoji, user.user_id);
        setWsName(""); setWsEmoji("🏘️"); setShowWsForm(false);
        await loadAll(user.user_id);
    }

    async function handleComplete(id: string) {
        if (!user) return;
        await completeActionItem(id);
        await Promise.all([loadAll(user.user_id), loadMeetings(user.user_id, activeWs?.id)]);
    }

    async function handleNudge(item: GlobalActionItem) {
        setNudgeLoading(item.id);
        try { setNudgeMsg(await generateNudge(item.id)); }
        finally { setNudgeLoading(null); }
    }

    const pendingTasks = tasks.filter(t => !t.completed);
    const filteredTasks = activeWs ? tasks.filter(t => t.workspace_id === activeWs.id) : tasks;
    const processingMeetings = meetings.filter(m => PROCESSING.has(m.status));

    if (!user) return null; // redirecting

    return (
        <div className="flex h-screen w-full bg-black font-mono overflow-hidden">
            {/* ── Workspace Sidebar ── */}
            <aside className="w-14 flex-shrink-0 bg-[#030303] border-r border-zinc-900 flex flex-col items-center py-3 gap-2">
                <button
                    onClick={() => { setActiveWs(null); setTab("overview"); }}
                    title="All Communities"
                    className={`w-9 h-9 rounded flex items-center justify-center text-base transition border ${activeWs === null ? "border-green-600 text-green-400 bg-green-950/40" : "border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400"
                        }`}
                >⚡</button>
                <div className="w-6 border-t border-zinc-900" />
                {workspaces.map(ws => (
                    <button
                        key={ws.id}
                        onClick={() => { setActiveWs(ws); setTab("meetings"); }}
                        title={ws.name}
                        className={`w-9 h-9 rounded flex items-center justify-center text-base transition border ${activeWs?.id === ws.id ? "border-green-600 bg-green-950/40" : "border-zinc-800 text-zinc-600 hover:border-zinc-600"
                            }`}
                    >{ws.icon_emoji}</button>
                ))}
                <button
                    onClick={() => setShowWsForm(v => !v)}
                    title="New Community"
                    className="w-9 h-9 rounded border border-dashed border-zinc-800 hover:border-zinc-600 flex items-center justify-center text-zinc-700 hover:text-zinc-400 transition text-lg"
                >+</button>
                {/* Spacer + logout at bottom */}
                <div className="flex-1" />
                <button onClick={handleLogout} title="Sign out" className="w-9 h-9 rounded border border-zinc-900 hover:border-red-900 flex items-center justify-center text-zinc-700 hover:text-red-500 transition text-xs">
                    ⏻
                </button>
            </aside>

            {/* ── Main Panel ── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top bar */}
                <header className="flex-shrink-0 border-b border-zinc-900 bg-[#030303] px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-green-400 font-bold text-xs tracking-[0.25em] uppercase">CommunitAI</span>
                        {activeWs && <><span className="text-zinc-800">/</span><span className="text-zinc-500 text-xs">{activeWs.icon_emoji} {activeWs.name}</span></>}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-700">
                        {processingMeetings.length > 0 && (
                            <span className="text-blue-500 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                {processingMeetings.length} processing
                            </span>
                        )}
                        <span className="text-zinc-600">{user.is_demo ? "DEMO" : user.display_name || user.email}</span>
                        <span className="text-green-600 font-bold tabular-nums">{clock}</span>
                    </div>
                </header>

                {/* Tab bar */}
                <nav className="flex-shrink-0 border-b border-zinc-900 bg-[#030303] px-4 flex gap-0">
                    {(["overview", "tasks", "meetings"] as Tab[]).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-2 text-xs uppercase tracking-widest border-b-2 transition ${tab === t ? "border-green-500 text-green-400" : "border-transparent text-zinc-600 hover:text-zinc-400"
                                }`}
                        >
                            {t === "overview" ? "⚡ Overview" : t === "tasks" ? "✓ Tasks" : "🎙 Meetings"}
                        </button>
                    ))}
                </nav>

                {/* Content */}
                <main className="flex-1 overflow-auto p-4">
                    {loading ? (
                        <p className="text-zinc-700 text-xs">Connecting to data feed<span className="blink">_</span></p>
                    ) : (
                        <>
                            {tab === "overview" && <OverviewTab
                                workspaces={workspaces} meetings={meetings} pendingTasks={pendingTasks}
                                onComplete={handleComplete} onNudge={handleNudge} nudgeLoading={nudgeLoading}
                                title={title} setTitle={setTitle} file={file} setFile={setFile}
                                uploading={uploading} uploadErr={uploadErr} onUpload={handleUpload}
                                activeWs={activeWs}
                            />}
                            {tab === "tasks" && <TasksTab
                                tasks={filteredTasks} activeWs={activeWs}
                                onComplete={handleComplete} onNudge={handleNudge} nudgeLoading={nudgeLoading}
                            />}
                            {tab === "meetings" && <MeetingsTab
                                meetings={meetings} activeWs={activeWs}
                                title={title} setTitle={setTitle} file={file} setFile={setFile}
                                uploading={uploading} uploadErr={uploadErr} onUpload={handleUpload}
                            />}
                        </>
                    )}
                </main>

                {/* Status bar */}
                <footer className="flex-shrink-0 border-t border-zinc-900 bg-[#030303] px-4 py-1 flex items-center gap-6 text-xs text-zinc-700">
                    <span><span className="text-green-700">●</span> DB CONNECTED</span>
                    <span>WORKSPACES: <span className="text-zinc-500">{workspaces.length}</span></span>
                    <span>OPEN TASKS: <span className="text-yellow-700">{pendingTasks.length}</span></span>
                    <span>MEETINGS: <span className="text-zinc-500">{meetings.length}</span></span>
                    <div className="flex-1" />
                    <span className="text-zinc-800">CommunitAI v1.0 · DigitalOcean Gradient AI</span>
                </footer>
            </div>

            {/* ── New Workspace Modal ── */}
            {showWsForm && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowWsForm(false)}>
                    <form onSubmit={handleCreateWs} onClick={e => e.stopPropagation()}
                        className="panel rounded w-72 p-5 space-y-3">
                        <p className="text-xs text-zinc-400 uppercase tracking-widest">New Community</p>
                        <div className="flex gap-2">
                            <input value={wsEmoji} onChange={e => setWsEmoji(e.target.value)}
                                className="w-12 bg-black border border-zinc-800 rounded px-2 py-2 text-center text-base focus:outline-none focus:border-green-700"
                                maxLength={2} />
                            <input value={wsName} onChange={e => setWsName(e.target.value)}
                                placeholder="Community name" required
                                className="flex-1 bg-black border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-green-700" />
                        </div>
                        <button type="submit" className="w-full bg-green-700 hover:bg-green-600 text-black font-bold text-xs uppercase tracking-widest py-2 rounded transition">
                            Create
                        </button>
                    </form>
                </div>
            )}

            {/* ── Nudge Modal ── */}
            {nudgeMsg && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setNudgeMsg("")}>
                    <div onClick={e => e.stopPropagation()} className="panel border-green-900 rounded w-96 p-5 space-y-3">
                        <p className="text-xs text-green-500 uppercase tracking-widest">⚡ Gradient AI · Generated Nudge</p>
                        <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap border border-zinc-800 rounded p-3 bg-black">{nudgeMsg}</p>
                        <div className="flex gap-2">
                            <button onClick={() => navigator.clipboard.writeText(nudgeMsg)}
                                className="flex-1 bg-green-700 hover:bg-green-600 text-black font-bold text-xs uppercase tracking-widest py-2 rounded transition">
                                Copy
                            </button>
                            <button onClick={() => setNudgeMsg("")}
                                className="px-4 border border-zinc-800 hover:border-zinc-600 text-zinc-500 text-xs py-2 rounded transition">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
