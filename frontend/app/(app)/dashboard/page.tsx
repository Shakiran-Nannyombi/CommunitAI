"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    getWorkspaces, createWorkspace, getMeetings, createMeeting, uploadAudio,
    getGlobalTasks, completeActionItem, generateNudge, clearAuth, loadAuth,
    type Workspace, type GlobalActionItem, type AuthUser, MeetingListItem
} from "@/lib/api";
import { OverviewTab, TasksTab, MeetingsTab } from "./_components";
import {
    Zap,
    LayoutDashboard,
    CheckSquare,
    Mic,
    Plus,
    LogOut,
    Loader2,
    PlusCircle,
    Sparkles,
    Copy,
    X
} from "lucide-react";

const PROCESSING = new Set(["pending", "processing", "transcribed"]);

type Tab = "overview" | "tasks" | "meetings";

export default function CommandCentre() {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [activeWs, setActiveWs] = useState<Workspace | null>(null);
    const searchParams = useSearchParams();
    const tab = (searchParams.get("tab") as Tab) || "overview";

    const setTab = useCallback((t: Tab) => {
        const params = new URLSearchParams(searchParams);
        params.set("tab", t);
        router.push(`/dashboard?${params.toString()}`);
    }, [router, searchParams]);

    const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
    const [tasks, setTasks] = useState<GlobalActionItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [title, setTitle] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadErr, setUploadErr] = useState("");

    const [wsName, setWsName] = useState("");
    const [wsEmoji, setWsEmoji] = useState("folder"); // Default icon name
    const [showWsForm, setShowWsForm] = useState(false);

    const [nudgeMsg, setNudgeMsg] = useState("");
    const [nudgeLoading, setNudgeLoading] = useState<string | null>(null);

    useEffect(() => {
        const auth = loadAuth();
        if (!auth) { router.replace("/login"); return; }
        setUser(auth);
    }, [router]);

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

    useEffect(() => { if (user) loadAll(user.user_id); }, [user, loadAll]);
    useEffect(() => { if (user) loadMeetings(user.user_id, activeWs?.id); }, [user, activeWs, loadMeetings]);

    useEffect(() => {
        if (!user) return;
        const hasProcessing = meetings.some(m => PROCESSING.has(m.status));
        if (!hasProcessing) return;
        const t = setInterval(() => loadMeetings(user.user_id, activeWs?.id), 4000);
        return () => clearInterval(t);
    }, [meetings, user, activeWs, loadMeetings]);

    function handleLogout() { clearAuth(); router.push("/home"); }

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
        setWsName(""); setWsEmoji("folder"); setShowWsForm(false);
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

    if (!user) return null;

    const TABS_INFO: { id: Tab; label: string; icon: any }[] = [
        { id: "overview", label: "Overview", icon: LayoutDashboard },
        { id: "tasks", label: "Tasks", icon: CheckSquare },
        { id: "meetings", label: "Meetings", icon: Mic },
    ];

    return (
        <div className="flex flex-col h-screen bg-background">
            {/* Header */}
            <header className="shrink-0 border-b border-text/5 bg-background/80 backdrop-blur-md px-10 py-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shadow-lg shadow-accent/5">
                        {(() => {
                            const Icon = TABS_INFO.find(t => t.id === tab)?.icon || LayoutDashboard;
                            return <Icon className="w-6 h-6 text-accent" />;
                        })()}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-text tracking-tight capitalize">
                            {TABS_INFO.find(t => t.id === tab)?.label ?? "Dashboard"}
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent/50" />
                            <p className="text-xs font-semibold text-text/50 uppercase tracking-widest">
                                {tab === "overview" ? `${workspaces.length} Workspaces · ${pendingTasks.length} Open Tasks` : tab === "tasks" ? `${pendingTasks.length} Open · ${tasks.length} Total` : `${meetings.length} Meetings total`}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {processingMeetings.length > 0 && (
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                            {processingMeetings.length} Processing
                        </div>
                    )}
                    <button onClick={() => setTab("meetings")}
                        className="flex items-center gap-2 text-sm font-bold px-6 py-2.5 rounded-2xl bg-accent text-background hover:bg-accent/90 transition-all duration-300 shadow-xl shadow-accent/20 active:scale-95">
                        <PlusCircle className="w-5 h-5" />
                        New Meeting
                    </button>
                </div>
            </header>


                {/* Content */}
                <main className="flex-1 overflow-auto p-12">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="relative">
                                <div className="w-12 h-12 border-4 border-accent/10 border-t-accent rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Zap className="w-4 h-4 text-accent/50" />
                                </div>
                            </div>
                            <p className="text-sm font-medium text-text/40 mt-6 animate-pulse">Initializing your cockpit…</p>
                        </div>
                    ) : (
                        <>
                            {tab === "overview" && !activeWs && <OverviewTab
                                workspaces={workspaces} meetings={meetings} pendingTasks={pendingTasks}
                                onComplete={handleComplete} onNudge={handleNudge} nudgeLoading={nudgeLoading}
                                title={title} setTitle={setTitle} file={file} setFile={setFile}
                                uploading={uploading} uploadErr={uploadErr} onUpload={handleUpload}
                                activeWs={activeWs}
                            />}
                            {tab === "tasks" && !activeWs && <TasksTab
                                tasks={filteredTasks} activeWs={activeWs}
                                onComplete={handleComplete} onNudge={handleNudge} nudgeLoading={nudgeLoading}
                            />}
                            {tab === "meetings" && !activeWs && <MeetingsTab
                                meetings={meetings} activeWs={activeWs}
                                title={title} setTitle={setTitle} file={file} setFile={setFile}
                                uploading={uploading} uploadErr={uploadErr} onUpload={handleUpload}
                            />}
                        </>
                    )}
                </main>

            {/* ── New Workspace Modal ── */}
            {showWsForm && (
                <div className="fixed inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-50"
                    onClick={() => setShowWsForm(false)}>
                    <form onSubmit={handleCreateWs} onClick={e => e.stopPropagation()}
                        className="bg-background border border-text/10 rounded-xl w-80 p-5 shadow-2xl space-y-4">
                        <div>
                            <h2 className="text-sm font-semibold text-text">New Workspace</h2>
                            <p className="text-xs text-text/50 mt-0.5">Create a space for your team or project</p>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-12 bg-text/5 border border-text/5 rounded-xl flex items-center justify-center text-text/40">
                                <LayoutDashboard className="w-5 h-5" />
                            </div>
                            <input value={wsName} onChange={e => setWsName(e.target.value)}
                                placeholder="Workspace name" required
                                className="flex-1 bg-text/5 border border-text/5 rounded-xl px-4 py-3 text-sm text-text placeholder-text/20 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all duration-200" />
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setShowWsForm(false)}
                                className="flex-1 py-2.5 rounded-lg border border-text/10 text-sm text-text/40 hover:text-text hover:bg-text/5 transition">
                                Cancel
                            </button>
                            <button type="submit"
                                className="flex-1 py-2.5 rounded-lg bg-accent hover:bg-accent/90 text-background font-semibold text-sm transition">
                                Create
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Nudge Modal ── */}
            {nudgeMsg && (
                <div className="fixed inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-50"
                    onClick={() => setNudgeMsg("")}>
                    <div onClick={e => e.stopPropagation()}
                        className="bg-background border border-text/10 rounded-xl w-[420px] p-5 shadow-2xl space-y-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-inner">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <h2 className="text-base font-bold text-text tracking-tight">AI Insights</h2>
                        </div>
                        <p className="text-sm text-text/80 leading-relaxed bg-text/5 border border-text/5 rounded-lg p-4 whitespace-pre-wrap">
                            {nudgeMsg}
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => navigator.clipboard.writeText(nudgeMsg)}
                                className="flex-1 py-2.5 rounded-lg bg-accent hover:bg-accent/90 text-background font-semibold text-sm transition">
                                Copy
                            </button>
                            <button onClick={() => setNudgeMsg("")}
                                className="px-4 py-2.5 rounded-lg border border-text/10 text-sm text-text/40 hover:text-text hover:bg-text/5 transition">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
