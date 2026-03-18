"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    getMeeting, completeActionItem, retryMeeting, generateNudge, loadAuth,
    getWorkspaces, patchTranscript, patchActionItem, deleteActionItem, addActionItem, shareToSlack,
    type MeetingDetail, type ActionItem, type Workspace,
} from "@/lib/api";

const POLL_INTERVAL = 4000;
const PROCESSING = new Set(["pending", "processing", "transcribed"]);

const STATUS_COLOR: Record<string, string> = {
    pending: "text-yellow-400 border-yellow-800 bg-yellow-400/10",
    processing: "text-blue-400 border-blue-800 bg-blue-400/10",
    transcribed: "text-blue-400 border-blue-800 bg-blue-400/10",
    complete: "text-green-400 border-green-800 bg-green-400/10",
    transcription_failed: "text-red-400 border-red-800 bg-red-400/10",
    analysis_failed: "text-red-400 border-red-800 bg-red-400/10",
    summarization_failed: "text-red-400 border-red-800 bg-red-400/10",
};

const SENTIMENT_COLOR: Record<string, string> = {
    positive: "text-green-400",
    neutral: "text-yellow-400",
    negative: "text-red-400",
};

const SENTIMENT_BG: Record<string, string> = {
    positive: "border-green-800 bg-green-400/5",
    neutral: "border-yellow-800 bg-yellow-400/5",
    negative: "border-red-800 bg-red-400/5",
};

interface EditingItem {
    description: string;
    assignee: string;
    due_date: string;
}

export default function MeetingPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState(false);
    const [nudgeMsg, setNudgeMsg] = useState("");
    const [nudgeLoading, setNudgeLoading] = useState<string | null>(null);
    const [workspace, setWorkspace] = useState<Workspace | null>(null);

    // Transcript editing state
    const [transcriptText, setTranscriptText] = useState("");
    const [transcriptSaving, setTranscriptSaving] = useState(false);
    const [transcriptSaved, setTranscriptSaved] = useState(false);
    const [transcriptError, setTranscriptError] = useState("");

    // Action item inline editing state
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editingValues, setEditingValues] = useState<EditingItem>({ description: "", assignee: "", due_date: "" });
    const [itemSaving, setItemSaving] = useState(false);
    const [itemError, setItemError] = useState<Record<string, string>>({});
    const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

    // Add action item state
    const [showAddForm, setShowAddForm] = useState(false);
    const [newItem, setNewItem] = useState({ description: "", assignee: "", due_date: "" });
    const [addingItem, setAddingItem] = useState(false);
    const [addItemError, setAddItemError] = useState("");

    // Slack sharing state
    const [slackSharing, setSlackSharing] = useState(false);
    const [slackMsg, setSlackMsg] = useState("");
    const [slackError, setSlackError] = useState("");

    useEffect(() => {
        if (!loadAuth()) { router.replace("/login"); }
    }, [router]);

    const load = useCallback(async () => {
        try {
            const data = await getMeeting(id);
            setMeeting(data);
            if (data.transcript) setTranscriptText(data.transcript);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!meeting || !PROCESSING.has(meeting.status)) return;
        const t = setInterval(load, POLL_INTERVAL);
        return () => clearInterval(t);
    }, [meeting, load]);

    // Fetch workspace for Slack button visibility
    useEffect(() => {
        if (!meeting?.workspace_id) return;
        const user = loadAuth();
        if (!user) return;
        getWorkspaces(user.user_id).then(workspaces => {
            const ws = workspaces.find(w => w.id === meeting.workspace_id);
            setWorkspace(ws ?? null);
        }).catch(() => { });
    }, [meeting?.workspace_id]);

    async function handleComplete(item: ActionItem) {
        if (item.completed) return;
        await completeActionItem(item.id);
        await load();
    }

    async function handleRetry() {
        setRetrying(true);
        try { await retryMeeting(id); await load(); }
        finally { setRetrying(false); }
    }

    async function handleNudge(item: ActionItem) {
        setNudgeLoading(item.id);
        try {
            const msg = await generateNudge(item.id);
            setNudgeMsg(msg);
        } finally {
            setNudgeLoading(null);
        }
    }

    // --- Transcript save ---
    async function handleSaveTranscript() {
        setTranscriptSaving(true);
        setTranscriptError("");
        setTranscriptSaved(false);
        try {
            await patchTranscript(id, transcriptText);
            setTranscriptSaved(true);
            setTimeout(() => setTranscriptSaved(false), 3000);
        } catch {
            setTranscriptError("Failed to save transcript. Please try again.");
        } finally {
            setTranscriptSaving(false);
        }
    }

    // --- Action item edit ---
    function startEditItem(item: ActionItem) {
        setEditingItemId(item.id);
        setEditingValues({
            description: item.description,
            assignee: item.assignee,
            due_date: item.due_date ?? "",
        });
        setItemError(prev => ({ ...prev, [item.id]: "" }));
    }

    function cancelEditItem() {
        setEditingItemId(null);
        setItemError({});
    }

    async function handleSaveItem(item: ActionItem) {
        setItemSaving(true);
        setItemError(prev => ({ ...prev, [item.id]: "" }));
        try {
            const updated = await patchActionItem(item.id, {
                description: editingValues.description,
                assignee: editingValues.assignee,
                due_date: editingValues.due_date || null,
            });
            setMeeting(prev => prev ? {
                ...prev,
                action_items: prev.action_items.map(a => a.id === item.id ? updated : a),
            } : prev);
            setEditingItemId(null);
        } catch {
            setItemError(prev => ({ ...prev, [item.id]: "Failed to save. Please try again." }));
        } finally {
            setItemSaving(false);
        }
    }

    async function handleDeleteItem(item: ActionItem) {
        setDeletingItemId(item.id);
        setItemError(prev => ({ ...prev, [item.id]: "" }));
        try {
            await deleteActionItem(item.id);
            setMeeting(prev => prev ? {
                ...prev,
                action_items: prev.action_items.filter(a => a.id !== item.id),
            } : prev);
        } catch {
            setItemError(prev => ({ ...prev, [item.id]: "Failed to delete. Please try again." }));
        } finally {
            setDeletingItemId(null);
        }
    }

    // --- Add action item ---
    async function handleAddItem(e: React.FormEvent) {
        e.preventDefault();
        if (!newItem.description.trim()) return;
        setAddingItem(true);
        setAddItemError("");
        try {
            const created = await addActionItem(id, {
                description: newItem.description,
                assignee: newItem.assignee,
                due_date: newItem.due_date || null,
            });
            setMeeting(prev => prev ? {
                ...prev,
                action_items: [...prev.action_items, created],
            } : prev);
            setNewItem({ description: "", assignee: "", due_date: "" });
            setShowAddForm(false);
        } catch {
            setAddItemError("Failed to add action item. Please try again.");
        } finally {
            setAddingItem(false);
        }
    }

    // --- Slack share ---
    async function handleShareSlack() {
        setSlackSharing(true);
        setSlackMsg("");
        setSlackError("");
        try {
            await shareToSlack(id);
            setSlackMsg("Shared to Slack successfully.");
            setTimeout(() => setSlackMsg(""), 4000);
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            setSlackError(status ? `Failed to share to Slack (status ${status}).` : "Failed to share to Slack.");
        } finally {
            setSlackSharing(false);
        }
    }

    // --- Email share ---
    function handleShareEmail() {
        if (!meeting) return;
        const subject = encodeURIComponent(meeting.title);
        const actionItemLines = meeting.action_items.map((item, i) => {
            const due = item.due_date ? `, Due: ${item.due_date}` : "";
            return `${i + 1}. ${item.description} — Assigned to: ${item.assignee}${due}`;
        }).join("\n");
        const body = encodeURIComponent(
            `${meeting.summary ?? ""}\n\nAction Items:\n${actionItemLines}`
        );
        window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
    }

    if (loading) return (
        <div className="flex min-h-screen bg-black text-white font-mono items-center justify-center">
            <span className="text-zinc-600 text-sm">Loading...</span>
        </div>
    );

    if (!meeting) return (
        <div className="flex min-h-screen bg-black text-white font-mono items-center justify-center">
            <span className="text-red-400 text-sm">Meeting not found</span>
        </div>
    );

    const isProcessing = PROCESSING.has(meeting.status);
    const isFailed = meeting.status.endsWith("_failed");
    const isComplete = meeting.status === "complete";
    const sentiment = meeting.sentiment;

    return (
        <div className="flex min-h-screen w-full bg-black text-white font-mono flex-col">
            <header className="border-b border-zinc-800 px-6 py-3 flex items-center gap-4 flex-shrink-0">
                <button onClick={() => router.push("/")} className="text-zinc-600 hover:text-green-400 transition text-sm">
                    back
                </button>
                <span className="text-zinc-800">|</span>
                <span className="text-green-400 font-bold text-sm tracking-widest uppercase">CommunitAI</span>
                <span className="text-zinc-700">/</span>
                <span className="text-zinc-300 text-sm truncate">{meeting.title}</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded border ${STATUS_COLOR[meeting.status] ?? "text-zinc-400 border-zinc-700"}`}>
                    {isProcessing ? (
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                            {meeting.status}
                        </span>
                    ) : meeting.status.replace(/_/g, " ")}
                </span>
            </header>

            <main className="flex-1 overflow-auto p-6 max-w-4xl w-full mx-auto space-y-4">
                <div className="flex items-center gap-4 text-xs text-zinc-600">
                    <span>{new Date(meeting.created_at).toLocaleString()}</span>
                    {meeting.action_items.length > 0 && (
                        <span>{meeting.action_items.filter(a => !a.completed).length} open tasks</span>
                    )}
                </div>

                {/* Sharing buttons */}
                {isComplete && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {workspace?.slack_webhook_url && (
                            <button
                                onClick={handleShareSlack}
                                disabled={slackSharing}
                                className="text-xs px-3 py-1.5 rounded border border-zinc-700 hover:border-green-600 text-zinc-400 hover:text-green-400 transition disabled:opacity-50"
                            >
                                {slackSharing ? "Sharing..." : "Share to Slack"}
                            </button>
                        )}
                        <button
                            onClick={handleShareEmail}
                            className="text-xs px-3 py-1.5 rounded border border-zinc-700 hover:border-blue-600 text-zinc-400 hover:text-blue-400 transition"
                        >
                            Share via Email
                        </button>
                        {slackMsg && <span className="text-xs text-green-400">{slackMsg}</span>}
                        {slackError && <span className="text-xs text-red-400">{slackError}</span>}
                    </div>
                )}

                {isProcessing && (
                    <div className="bg-zinc-950 border border-zinc-800 rounded p-4 flex items-center gap-3">
                        <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                        <p className="text-sm text-zinc-400">Processing your meeting - this may take a minute.</p>
                    </div>
                )}

                {isFailed && (
                    <div className="bg-zinc-950 border border-red-900 rounded p-4 flex items-center justify-between">
                        <p className="text-sm text-red-400">
                            Failed at: <span className="font-semibold">{meeting.status.replace(/_/g, " ")}</span>
                        </p>
                        <button
                            onClick={handleRetry}
                            disabled={retrying}
                            className="text-xs px-3 py-1.5 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white rounded transition"
                        >
                            {retrying ? "Retrying..." : "Retry"}
                        </button>
                    </div>
                )}

                {meeting.summary && (
                    <section className="bg-zinc-950 border border-zinc-800 rounded">
                        <div className="px-4 py-2.5 border-b border-zinc-800">
                            <span className="text-green-400 text-xs uppercase tracking-widest">Summary</span>
                        </div>
                        <p className="px-4 py-4 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {meeting.summary}
                        </p>
                    </section>
                )}

                {sentiment && (
                    <section className={`border rounded p-4 ${SENTIMENT_BG[sentiment.classification] ?? ""}`}>
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-xs text-zinc-500 uppercase tracking-widest">Community Health</span>
                            <span className={`text-sm font-bold capitalize ${SENTIMENT_COLOR[sentiment.classification] ?? ""}`}>
                                {sentiment.classification}
                            </span>
                        </div>
                        {sentiment.signals.length > 0 && (
                            <ul className="space-y-1.5">
                                {sentiment.signals.map((s, i) => (
                                    <li key={i} className="text-xs text-zinc-400">
                                        <span className="text-zinc-300 capitalize">{s.type.replace(/_/g, " ")}</span>
                                        {" - "}{s.excerpt}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                )}

                {/* Action Items */}
                <section className="bg-zinc-950 border border-zinc-800 rounded">
                    <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
                        <span className="text-xs text-zinc-500 uppercase tracking-widest">Action Items</span>
                        {meeting.action_items.length > 0 && (
                            <span className="text-xs text-zinc-600">
                                {meeting.action_items.filter(a => a.completed).length}/{meeting.action_items.length} done
                            </span>
                        )}
                    </div>
                    <ul className="divide-y divide-zinc-800/50">
                        {meeting.action_items.map(item => (
                            <li key={item.id} className={`px-4 py-3 ${item.completed && editingItemId !== item.id ? "opacity-40" : ""}`}>
                                {editingItemId === item.id ? (
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={editingValues.description}
                                            onChange={e => setEditingValues(v => ({ ...v, description: e.target.value }))}
                                            placeholder="Description"
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-green-600"
                                        />
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={editingValues.assignee}
                                                onChange={e => setEditingValues(v => ({ ...v, assignee: e.target.value }))}
                                                placeholder="Assignee"
                                                className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-green-600"
                                            />
                                            <input
                                                type="date"
                                                value={editingValues.due_date}
                                                onChange={e => setEditingValues(v => ({ ...v, due_date: e.target.value }))}
                                                className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-green-600"
                                            />
                                        </div>
                                        {itemError[item.id] && (
                                            <p className="text-xs text-red-400">{itemError[item.id]}</p>
                                        )}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSaveItem(item)}
                                                disabled={itemSaving}
                                                className="text-xs px-3 py-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded transition"
                                            >
                                                {itemSaving ? "Saving..." : "Save"}
                                            </button>
                                            <button
                                                onClick={cancelEditItem}
                                                className="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-3">
                                        <button
                                            onClick={() => handleComplete(item)}
                                            className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition ${item.completed ? "bg-green-600 border-green-600" : "border-zinc-600 hover:border-green-500"}`}
                                        >
                                            {item.completed && <span className="text-white text-[10px]">v</span>}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm text-white ${item.completed ? "line-through" : ""}`}>{item.description}</p>
                                            <div className="flex gap-3 mt-0.5">
                                                <span className="text-xs text-zinc-500">@{item.assignee}</span>
                                                {item.due_date && <span className="text-xs text-yellow-600">due {item.due_date}</span>}
                                            </div>
                                            {itemError[item.id] && (
                                                <p className="text-xs text-red-400 mt-1">{itemError[item.id]}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {!item.completed && (
                                                <button
                                                    onClick={() => handleNudge(item)}
                                                    disabled={nudgeLoading === item.id}
                                                    className="text-xs px-2 py-1 rounded border border-zinc-700 hover:border-green-600 text-zinc-500 hover:text-green-400 transition disabled:opacity-50"
                                                >
                                                    {nudgeLoading === item.id ? "..." : "Nudge"}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => startEditItem(item)}
                                                className="text-xs px-2 py-1 rounded border border-zinc-700 hover:border-blue-600 text-zinc-500 hover:text-blue-400 transition"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteItem(item)}
                                                disabled={deletingItemId === item.id}
                                                className="text-xs px-2 py-1 rounded border border-zinc-700 hover:border-red-600 text-zinc-500 hover:text-red-400 transition disabled:opacity-50"
                                            >
                                                {deletingItemId === item.id ? "..." : "Delete"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>

                    {/* Add action item */}
                    {showAddForm ? (
                        <form onSubmit={handleAddItem} className="px-4 py-3 border-t border-zinc-800 space-y-2">
                            <input
                                type="text"
                                value={newItem.description}
                                onChange={e => setNewItem(v => ({ ...v, description: e.target.value }))}
                                placeholder="Description *"
                                required
                                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-green-600"
                            />
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newItem.assignee}
                                    onChange={e => setNewItem(v => ({ ...v, assignee: e.target.value }))}
                                    placeholder="Assignee"
                                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-green-600"
                                />
                                <input
                                    type="date"
                                    value={newItem.due_date}
                                    onChange={e => setNewItem(v => ({ ...v, due_date: e.target.value }))}
                                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-green-600"
                                />
                            </div>
                            {addItemError && <p className="text-xs text-red-400">{addItemError}</p>}
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={addingItem}
                                    className="text-xs px-3 py-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded transition"
                                >
                                    {addingItem ? "Adding..." : "Add"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowAddForm(false); setAddItemError(""); }}
                                    className="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="px-4 py-3 border-t border-zinc-800">
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="text-xs text-zinc-500 hover:text-green-400 transition"
                            >
                                + Add action item
                            </button>
                        </div>
                    )}
                </section>

                {/* Transcript — editable */}
                {(meeting.transcript !== null || isComplete) && (
                    <section className="bg-zinc-950 border border-zinc-800 rounded">
                        <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
                            <span className="text-xs text-zinc-500 uppercase tracking-widest">Transcript</span>
                            <div className="flex items-center gap-2">
                                {transcriptSaved && <span className="text-xs text-green-400">Saved</span>}
                                {transcriptError && <span className="text-xs text-red-400">{transcriptError}</span>}
                                <button
                                    onClick={handleSaveTranscript}
                                    disabled={transcriptSaving}
                                    className="text-xs px-3 py-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded transition"
                                >
                                    {transcriptSaving ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </div>
                        <textarea
                            value={transcriptText}
                            onChange={e => {
                                setTranscriptText(e.target.value);
                                setTranscriptSaved(false);
                                setTranscriptError("");
                            }}
                            rows={10}
                            className="w-full bg-transparent px-4 py-3 text-xs text-zinc-400 leading-relaxed resize-y focus:outline-none focus:bg-zinc-900/30 transition"
                            placeholder="Transcript will appear here once processing is complete..."
                        />
                    </section>
                )}
            </main>

            {nudgeMsg && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setNudgeMsg("")}>
                    <div onClick={e => e.stopPropagation()} className="bg-zinc-950 border border-green-800 rounded-lg p-6 w-96 space-y-4">
                        <p className="text-xs text-green-400 uppercase tracking-widest">Generated Nudge</p>
                        <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{nudgeMsg}</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => navigator.clipboard.writeText(nudgeMsg)}
                                className="flex-1 bg-green-700 hover:bg-green-600 text-white text-xs py-2 rounded transition"
                            >
                                Copy
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
