"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    getWorkspaces, getMeetings, patchWorkspace, loadAuth,
    type Workspace, type MeetingListItem,
} from "@/lib/api";
import PlannerTab from "./_planner";
import ImpactTab from "./_impact";
import { 
    LayoutDashboard, Calendar, BarChart3, Settings, 
    ChevronRight, Hash, Users, Zap, Bell, Slack,
    Loader2, AlertCircle, CheckCircle2, MoreVertical
} from "lucide-react";

type Tab = "meetings" | "planner" | "impact";

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
    pending: { color: "text-amber-400", bg: "bg-amber-500/10" },
    processing: { color: "text-blue-400", bg: "bg-blue-500/10" },
    transcribed: { color: "text-blue-400", bg: "bg-blue-500/10" },
    complete: { color: "text-accent", bg: "bg-accent/10" },
    failed: { color: "text-red-400", bg: "bg-red-500/10" },
};

export default function WorkspacePage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();

    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
    const [tab, setTab] = useState<Tab>("meetings");
    const [loading, setLoading] = useState(true);

    // Settings state
    const [webhookUrl, setWebhookUrl] = useState("");
    const [webhookSaving, setWebhookSaving] = useState(false);
    const [webhookSaved, setWebhookSaved] = useState(false);
    const [webhookError, setWebhookError] = useState("");

    const userId = loadAuth()?.user_id ?? "";

    useEffect(() => {
        if (!loadAuth()) { router.replace("/login"); }
    }, [router]);

    const load = useCallback(async () => {
        if (!userId || !id) return;
        try {
            const [workspaces, mtgs] = await Promise.all([
                getWorkspaces(userId),
                getMeetings(userId, id),
            ]);
            const ws = workspaces.find(w => w.id === id) ?? null;
            setWorkspace(ws);
            setWebhookUrl(ws?.slack_webhook_url ?? "");
            setMeetings(mtgs);
        } finally {
            setLoading(false);
        }
    }, [id, userId]);

    useEffect(() => { load(); }, [load]);

    async function handleSaveWebhook(e: React.FormEvent) {
        e.preventDefault();
        setWebhookSaving(true);
        setWebhookError("");
        setWebhookSaved(false);
        try {
            const updated = await patchWorkspace(id, { slack_webhook_url: webhookUrl || null });
            setWorkspace(updated);
            setWebhookSaved(true);
            setTimeout(() => setWebhookSaved(false), 3000);
        } catch {
            setWebhookError("Failed to save. Please try again.");
        } finally {
            setWebhookSaving(false);
        }
    }

    if (loading) return (
        <div className="flex-1 flex items-center justify-center bg-background">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
    );

    if (!workspace) return (
        <div className="flex-1 flex flex-col items-center justify-center bg-background p-10 text-center">
            <div className="p-4 bg-red-500/10 rounded-full text-red-500 mb-4">
                <AlertCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-text">Workspace not found</h2>
            <p className="text-text/40 mt-2">The workspace you're looking for doesn't exist or has been deleted.</p>
            <button onClick={() => router.push('/dashboard')} className="mt-8 px-6 py-3 bg-text text-background font-black rounded-xl uppercase text-[10px] tracking-widest">Back to Dashboard</button>
        </div>
    );

    return (
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-accent/5 blur-[100px] rounded-full pointer-events-none" />
            {/* Header */}
            <header className="shrink-0 px-16 lg:px-20 py-16 bg-background/50 backdrop-blur-xl relative z-20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-12">
                    <div className="flex items-center gap-8">
                        <div className="w-20 h-20 rounded-[2.5rem] bg-accent/10 border border-accent/20 flex items-center justify-center text-4xl shadow-2xl shadow-accent/5">
                            {workspace.icon_emoji}
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-4">
                                <h1 className="text-5xl font-black text-text tracking-tighter leading-none">{workspace.name}</h1>
                                <button className="p-3 text-text/20 hover:text-accent hover:bg-accent/5 rounded-2xl transition-all duration-500">
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.3em] text-text/30">
                                <span className="flex items-center gap-2.5"><Users className="w-4 h-4" /> 12 MEMBERS</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-accent/40" />
                                <span className="flex items-center gap-2.5 text-accent"><Zap className="w-4 h-4" /> ACTIVE GROWTH</span>
                            </div>
                        </div>
                    </div>

                    <nav className="flex gap-2 p-2 bg-text/3 border border-text/5 rounded-4xl self-start md:self-auto">
                        {(["meetings", "planner", "impact"] as Tab[]).map(t => (
                            <button 
                                key={t} 
                                onClick={() => setTab(t)}
                                className={`px-8 py-3 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${
                                    tab === t 
                                        ? "bg-background text-text shadow-xl border border-text/10" 
                                        : "text-text/30 hover:text-text/60"
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
                <div className="max-w-7xl mx-auto px-16 lg:px-20 py-12 pb-48 space-y-24">
                    {tab === "meetings" && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-black text-text flex items-center gap-3">
                                    <LayoutDashboard className="w-5 h-5 text-accent" />
                                    Workspace Records
                                </h2>
                                <button className="text-[10px] font-black uppercase tracking-widest text-accent hover:underline">View All</button>
                            </div>

                            {meetings.length === 0 ? (
                                <div className="bg-text/2 border border-text/5 rounded-[2.5rem] py-20 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-text/5 rounded-full flex items-center justify-center text-text/10 mb-6">
                                        <Hash className="w-8 h-8" />
                                    </div>
                                    <p className="text-sm font-bold text-text/40 uppercase tracking-widest">No meetings recorded in this workspace</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    {meetings.map(m => (
                                        <Link 
                                            key={m.id}
                                            href={`/meetings/${m.id}`}
                                            className="group glass-card rounded-4xl p-8 hover:border-accent/40 transition-all duration-500 flex items-center justify-between shadow-premium hover:shadow-premium-hover"
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${STATUS_CONFIG[m.status]?.bg || 'bg-text/5'} ${STATUS_CONFIG[m.status]?.color || 'text-text/40'}`}>
                                                    <Calendar className="w-7 h-7" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-text group-hover:text-accent transition-colors tracking-tight">{m.title}</h3>
                                                    <p className="text-[10px] font-bold text-text/20 uppercase tracking-[0.2em] mt-1.5">
                                                        {new Date(m.created_at).toLocaleDateString("en-GB", { day: 'numeric', month: 'short' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-6 h-6 text-text/10 group-hover:text-accent group-hover:translate-x-1 transition-all duration-500" />
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === "planner" && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><PlannerTab workspaceId={id} /></div>}
                    {tab === "impact" && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><ImpactTab workspaceId={id} /></div>}

                    {/* Integrated Settings */}
                    <section className="bg-text/2 border border-text/5 rounded-[3rem] p-10 mt-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                                        <Slack className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-black text-text">Workspace Integrations</h3>
                                </div>
                                <p className="text-text/50 font-medium max-w-sm">Connect your Slack webhook to receive automated meeting summaries and action items.</p>
                            </div>

                            <form onSubmit={handleSaveWebhook} className="flex-1 space-y-4">
                                <div className="relative group">
                                    <Settings className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-text/20 group-focus-within:text-accent transition-colors" />
                                    <input
                                        type="url"
                                        value={webhookUrl}
                                        onChange={e => { setWebhookUrl(e.target.value); setWebhookSaved(false); setWebhookError(""); }}
                                        placeholder="https://hooks.slack.com/services/..."
                                        className="w-full bg-background border border-text/10 rounded-2xl pl-12 pr-6 py-4 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-accent/5 focus:border-accent/40 transition-all placeholder:text-text/20"
                                    />
                                </div>
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-2">
                                        {webhookSaved && <span className="flex items-center gap-1.5 text-[10px] font-black text-accent uppercase tracking-widest animate-in fade-in slide-in-from-left-2"><CheckCircle2 className="w-3.5 h-3.5" /> Context Tuned</span>}
                                        {webhookError && <span className="flex items-center gap-1.5 text-[10px] font-black text-red-500 uppercase tracking-widest animate-in fade-in slide-in-from-left-2"><AlertCircle className="w-3.5 h-3.5" /> Connection Failed</span>}
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={webhookSaving || !webhookUrl}
                                        className="px-8 py-4 bg-text text-background font-black rounded-2xl text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-2xl shadow-text/10"
                                    >
                                        {webhookSaving ? "SYNCING..." : "UPDATE SUBNET"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
