"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    getWorkspaces, createWorkspace, getMeetings, createMeeting, uploadAudio,
    getGlobalTasks, completeActionItem, generateNudge, clearAuth, loadAuth,
    type Workspace, type GlobalActionItem, type AuthUser, type MeetingListItem,
} from "@/lib/api";
import { OverviewTab, TasksTab, MeetingsTab } from "./_components";
import { LogoMark, LogoFull } from "@/components/Logo";
import { motion } from "framer-motion";
import {
    LayoutDashboard, CheckSquare, Mic, Zap, Sparkles, Bell, Search, Settings as SettingsIcon, User as UserIcon
} from "lucide-react";

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
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [title, setTitle] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadErr, setUploadErr] = useState("");

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
        setMeetings(await getMeetings(uid, wsId));
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

    const navLinks = [
        {
            label: "Overview",
            href: "#",
            icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
            id: "overview" as Tab,
        },
        {
            label: `Tasks${pendingTasks.length > 0 ? ` (${pendingTasks.length})` : ""}`,
            href: "#",
            icon: <CheckSquare className="w-[18px] h-[18px]" />,
            id: "tasks" as Tab,
        },
        {
            label: "Meetings",
            href: "#",
            icon: <Mic className="w-[18px] h-[18px]" />,
            id: "meetings" as Tab,
        },
    ];

    return (
        <>
            {/* ── Main Dashboard Content ── */}
            <div className="flex flex-1 flex-col relative z-0">
                {/* Global Dashboard Header (Desktop) */}
                <header className="hidden md:flex sticky top-0 z-50 items-center justify-between bg-background px-16 py-8 border-b border-text/5">
                    <div className="flex items-center gap-6">
                        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-background shadow-lg shadow-accent/20">
                            <LayoutDashboard className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-text tracking-tighter leading-none">
                                Dashboard
                            </h1>
                            <p className="text-[10px] font-black uppercase tracking-widest text-text/20 mt-1.5">
                                Global Overview
                            </p>
                        </div>
                    </div>

                    <nav className="flex items-center gap-10">
                        {navLinks.map(link => (
                            <button
                                key={link.id}
                                onClick={() => setTab(link.id)}
                                className={`text-[12px] font-black uppercase tracking-widest transition-all ${tab === link.id ? "text-accent" : "text-text/40 hover:text-text"
                                    }`}
                            >
                                {link.label.split('(')[0].trim()}
                            </button>
                        ))}
                        <button className="text-[12px] font-black uppercase tracking-widest text-text/40 hover:text-text transition-all">Insights</button>
                    </nav>

                    <div className="flex items-center gap-6">
                        <button className="relative p-2 text-text/30 hover:text-accent transition-colors">
                            <Bell className="w-6 h-6" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background" />
                        </button>
                        <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center overflow-hidden shadow-sm">
                            <UserIcon className="w-6 h-6 text-accent/50" />
                        </div>
                    </div>
                </header>

                {/* Mobile Header (re-added for context) */}
                <div className="md:hidden shrink-0 px-6 py-6 border-b border-text/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                            <LayoutDashboard className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-text tracking-tight capitalize">
                                {activeWs ? activeWs.name : (navLinks.find(t => t.id === tab)?.label.split('(')[0].trim() || "Dashboard")}
                            </h1>
                        </div>
                    </div>
                </div>

                <div className="w-full relative px-6 md:px-16 lg:px-24 mt-12">
                    <div className="max-w-7xl mx-auto w-full">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-[50vh]">
                                <div className="relative">
                                    <div className="w-12 h-12 border-4 border-accent/10 border-t-accent rounded-full animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Zap className="w-4 h-4 text-accent/50" />
                                    </div>
                                </div>
                                <p className="text-sm font-medium text-text/40 mt-6 animate-pulse">Initializing your cockpit…</p>
                            </div>
                        ) : (
                            <div className="w-full relative z-0">
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
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {nudgeMsg && (
                <div className="fixed inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={() => setNudgeMsg("")}>
                    <div onClick={e => e.stopPropagation()}
                        className="bg-background border border-text/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-inner">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-text tracking-tight">AI-Generated Nudge</h2>
                                <p className="text-xs font-semibold text-text/40 uppercase tracking-widest mt-0.5">READY TO SEND</p>
                            </div>
                        </div>
                        <div className="bg-text/5 border border-text/5 rounded-xl p-4 max-h-[40vh] overflow-y-auto">
                            <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">
                                {nudgeMsg}
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => { navigator.clipboard.writeText(nudgeMsg); setNudgeMsg(""); }}
                                className="flex-1 py-3 rounded-xl bg-accent hover:bg-accent/90 text-background font-bold text-sm shadow-lg shadow-accent/20 transition-all">
                                Copy to Clipboard
                            </button>
                            <button onClick={() => setNudgeMsg("")}
                                className="px-6 py-3 rounded-xl border border-text/10 text-sm font-semibold text-text/50 hover:text-text hover:bg-text/5 transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}