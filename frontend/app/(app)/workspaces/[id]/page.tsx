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

type Tab = "meetings" | "planner" | "impact";

const STATUS_COLOR: Record<string, string> = {
    pending: "text-yellow-600",
    processing: "text-blue-500",
    transcribed: "text-blue-500",
    complete: "text-accent",
    transcription_failed: "text-red-500",
    analysis_failed: "text-red-500",
    summarization_failed: "text-red-500",
};

export default function WorkspacePage() {
    const { id } = useParams<{ id: string }>();
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
        if (!userId) return;
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
        <div className="flex min-h-screen bg-background text-text font-mono items-center justify-center">
            <span className="text-text/40 text-sm">Loading...</span>
        </div>
    );

    if (!workspace) return (
        <div className="flex min-h-screen bg-background text-text font-mono items-center justify-center">
            <span className="text-red-500 text-sm">Workspace not found</span>
        </div>
    );

    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* Header Area */}
            <div className="px-10 py-10 pb-6">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-accent/10 border border-accent/20 flex items-center justify-center text-3xl shadow-xl shadow-accent/5">
                        {workspace.icon_emoji}
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-text tracking-tight">{workspace.name}</h1>
                        <p className="text-sm font-semibold text-text/40 uppercase tracking-widest mt-1">Workspace Overview</p>
                    </div>
                </div>
            </div>

            {/* Tab bar */}
            <nav className="shrink-0 border-b border-text/10 bg-transparent px-10 flex gap-8">
                {(["meetings", "planner", "impact"] as Tab[]).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`pb-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all duration-300 ${tab === t ? "border-accent text-accent" : "border-transparent text-text/40 hover:text-text/60"}`}
                    >
                        {t === "meetings" ? "Meetings" : t === "planner" ? "Planner" : "Impact"}
                    </button>
                ))}
            </nav>

            {/* Content */}
            <main className="flex-1 overflow-auto p-10 max-w-6xl w-full space-y-10">
                {tab === "meetings" && (
                    <section className="bg-background border border-text/10 rounded shadow-sm">
                        <div className="px-4 py-2.5 border-b border-text/10 flex items-center justify-between">
                            <span className="text-xs text-text/50 uppercase tracking-widest font-bold">Meetings</span>
                            <span className="text-xs text-text/40">{meetings.length} total</span>
                        </div>
                        {meetings.length === 0 ? (
                            <p className="px-4 py-6 text-xs text-text/40">No meetings yet in this workspace.</p>
                        ) : (
                            <ul className="divide-y divide-text/5">
                                {meetings.map(m => (
                                    <li key={m.id}>
                                        <Link
                                            href={`/meetings/${m.id}`}
                                            className="flex items-center justify-between px-4 py-3 hover:bg-text/5 transition"
                                        >
                                            <span className="text-sm text-text/80 truncate">{m.title}</span>
                                            <div className="flex items-center gap-3 shrink-0 ml-4">
                                                <span className="text-xs text-text/40">
                                                    {new Date(m.created_at).toLocaleDateString()}
                                                </span>
                                                <span className={`text-xs font-medium ${STATUS_COLOR[m.status] ?? "text-text/30"}`}>
                                                    {m.status.replace(/_/g, " ")}
                                                </span>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                )}

                {tab === "planner" && <PlannerTab workspaceId={id} />}
                {tab === "impact" && <ImpactTab workspaceId={id} />}

                {/* Settings — always visible */}
                <section className="bg-background border border-text/10 rounded shadow-sm">
                    <div className="px-4 py-2.5 border-b border-text/10">
                        <span className="text-xs text-text/50 uppercase tracking-widest font-bold">Settings</span>
                    </div>
                    <form onSubmit={handleSaveWebhook} className="px-4 py-4 space-y-3">
                        <div>
                            <label className="block text-xs text-text/50 mb-1.5 uppercase tracking-widest">
                                Slack Webhook URL
                            </label>
                            <input
                                type="url"
                                value={webhookUrl}
                                onChange={e => { setWebhookUrl(e.target.value); setWebhookSaved(false); setWebhookError(""); }}
                                placeholder="https://hooks.slack.com/services/..."
                                className="w-full bg-text/5 border border-text/10 rounded px-3 py-2 text-xs text-text placeholder-text/20 focus:outline-none focus:border-accent transition"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="submit"
                                disabled={webhookSaving}
                                className="text-xs px-4 py-1.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-background font-bold rounded transition"
                            >
                                {webhookSaving ? "Saving..." : "Save"}
                            </button>
                            {webhookSaved && <span className="text-xs text-accent">Saved</span>}
                            {webhookError && <span className="text-xs text-red-500">{webhookError}</span>}
                        </div>
                    </form>
                </section>
            </main>
        </div>
    );
}
