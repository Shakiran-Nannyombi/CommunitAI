"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    getMeeting, completeActionItem, retryMeeting, generateNudge,
    type MeetingDetail, type ActionItem,
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

export default function MeetingPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState(false);
    const [nudgeMsg, setNudgeMsg] = useState("");
    const [nudgeLoading, setNudgeLoading] = useState<string | null>(null);
    const [transcriptOpen, setTranscriptOpen] = useState(false);

    const load = useCallback(async () => {
        try {
            const data = await getMeeting(id);
            setMeeting(data);
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

                {meeting.action_items.length > 0 && (
                    <section className="bg-zinc-950 border border-zinc-800 rounded">
                        <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
                            <span className="text-xs text-zinc-500 uppercase tracking-widest">Action Items</span>
                            <span className="text-xs text-zinc-600">
                                {meeting.action_items.filter(a => a.completed).length}/{meeting.action_items.length} done
                            </span>
                        </div>
                        <ul className="divide-y divide-zinc-800/50">
                            {meeting.action_items.map(item => (
                                <li key={item.id} className={`flex items-start gap-3 px-4 py-3 ${item.completed ? "opacity-40" : ""}`}>
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
                                    </div>
                                    {!item.completed && (
                                        <button
                                            onClick={() => handleNudge(item)}
                                            disabled={nudgeLoading === item.id}
                                            className="flex-shrink-0 text-xs px-2 py-1 rounded border border-zinc-700 hover:border-green-600 text-zinc-500 hover:text-green-400 transition disabled:opacity-50"
                                        >
                                            {nudgeLoading === item.id ? "..." : "Nudge"}
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {meeting.transcript && (
                    <section className="bg-zinc-950 border border-zinc-800 rounded">
                        <button
                            onClick={() => setTranscriptOpen(v => !v)}
                            className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-zinc-900 transition"
                        >
                            <span className="text-xs text-zinc-500 uppercase tracking-widest">Transcript</span>
                            <span className="text-zinc-600 text-xs">{transcriptOpen ? "collapse" : "expand"}</span>
                        </button>
                        {transcriptOpen && (
                            <p className="px-4 pb-4 text-xs text-zinc-500 leading-relaxed whitespace-pre-wrap border-t border-zinc-800 pt-3">
                                {meeting.transcript}
                            </p>
                        )}
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
