"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMeeting, completeActionItem, retryMeeting, type MeetingDetail } from "@/lib/api";

const POLL_INTERVAL = 4000;
const PROCESSING_STATUSES = new Set(["pending", "processing", "transcribed"]);

const sentimentColor = { positive: "text-green-400", neutral: "text-yellow-400", negative: "text-red-400" };
const sentimentBg = { positive: "bg-green-900/30 border-green-800", neutral: "bg-yellow-900/20 border-yellow-800", negative: "bg-red-900/20 border-red-800" };

export default function MeetingPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState(false);

    const load = useCallback(async () => {
        try {
            const data = await getMeeting(id);
            setMeeting(data);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    // Poll while processing
    useEffect(() => {
        if (!meeting || !PROCESSING_STATUSES.has(meeting.status)) return;
        const t = setInterval(load, POLL_INTERVAL);
        return () => clearInterval(t);
    }, [meeting, load]);

    async function handleComplete(actionId: string) {
        await completeActionItem(actionId);
        await load();
    }

    async function handleRetry() {
        setRetrying(true);
        try {
            await retryMeeting(id);
            await load();
        } finally {
            setRetrying(false);
        }
    }

    if (loading) return <div className="p-10 text-zinc-500">Loading…</div>;
    if (!meeting) return <div className="p-10 text-red-400">Meeting not found</div>;

    const isProcessing = PROCESSING_STATUSES.has(meeting.status);
    const isFailed = meeting.status.endsWith("_failed");
    const sentiment = meeting.sentiment;

    return (
        <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
            <button onClick={() => router.push("/")} className="text-sm text-zinc-500 hover:text-green-400 transition">
                ← Back
            </button>

            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">{meeting.title}</h1>
                    <p className="text-xs text-zinc-500 mt-1">{new Date(meeting.created_at).toLocaleString()}</p>
                </div>
                <span className={`text-sm font-semibold capitalize px-3 py-1 rounded-full border ${meeting.status === "complete" ? "border-green-700 text-green-400 bg-green-900/20" :
                        isFailed ? "border-red-700 text-red-400 bg-red-900/20" :
                            "border-blue-700 text-blue-400 bg-blue-900/20"
                    }`}>
                    {meeting.status.replace(/_/g, " ")}
                </span>
            </div>

            {/* Processing spinner */}
            {isProcessing && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex items-center gap-4">
                    <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-zinc-400">Processing your meeting… this may take a minute.</p>
                </div>
            )}

            {/* Retry button */}
            {isFailed && (
                <div className="bg-red-900/20 border border-red-800 rounded-xl p-5 flex items-center justify-between">
                    <p className="text-red-300 text-sm">Processing failed at: <span className="font-semibold">{meeting.status.replace(/_/g, " ")}</span></p>
                    <button
                        onClick={handleRetry}
                        disabled={retrying}
                        className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition"
                    >
                        {retrying ? "Retrying…" : "Retry"}
                    </button>
                </div>
            )}

            {/* Summary */}
            {meeting.summary && (
                <section className="bg-zinc-900 border border-green-900 rounded-xl p-6">
                    <h2 className="text-green-400 font-semibold mb-3">📋 Summary</h2>
                    <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-sans leading-relaxed">
                        {typeof meeting.summary === "string" ? meeting.summary : (meeting.summary as { content: string }).content}
                    </pre>
                </section>
            )}

            {/* Sentiment */}
            {sentiment && (
                <section className={`border rounded-xl p-6 ${sentimentBg[sentiment.classification]}`}>
                    <h2 className="font-semibold mb-3">
                        Community Health:{" "}
                        <span className={`capitalize ${sentimentColor[sentiment.classification]}`}>
                            {sentiment.classification}
                        </span>
                    </h2>
                    {sentiment.signals.length > 0 && (
                        <ul className="space-y-2">
                            {sentiment.signals.map((s, i) => (
                                <li key={i} className="text-sm text-zinc-300">
                                    <span className="font-medium text-zinc-100 capitalize">{s.type.replace(/_/g, " ")}</span>
                                    {" — "}{s.excerpt}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}

            {/* Action Items */}
            {meeting.action_items.length > 0 && (
                <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h2 className="font-semibold text-white mb-4">Action Items</h2>
                    <ul className="space-y-3">
                        {meeting.action_items.map(item => (
                            <li key={item.id} className="flex items-start gap-3">
                                <button
                                    onClick={() => !item.completed && handleComplete(item.id)}
                                    className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition ${item.completed
                                            ? "bg-green-600 border-green-600"
                                            : "border-zinc-600 hover:border-green-500"
                                        }`}
                                >
                                    {item.completed && <span className="text-white text-xs">✓</span>}
                                </button>
                                <div className={item.completed ? "opacity-50 line-through" : ""}>
                                    <p className="text-sm text-white">{item.description}</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        {item.assignee}{item.due_date ? ` · due ${item.due_date}` : ""}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Transcript */}
            {meeting.transcript && (
                <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h2 className="font-semibold text-white mb-3">Transcript</h2>
                    <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{meeting.transcript}</p>
                </section>
            )}
        </main>
    );
}
