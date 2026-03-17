"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import TranscriptView from "@/components/TranscriptView";
import SentimentCard from "@/components/SentimentCard";
import SummaryCard from "@/components/SummaryCard";
import ActionItemList from "@/components/ActionItemList";
import { getMeeting, retryMeeting, deleteMeeting } from "@/lib/api";
import type { MeetingDetail } from "@/lib/api";

const POLL_STATUSES = new Set(["processing", "transcribed"]);
const FAILED_STATUSES = new Set([
    "transcription_failed",
    "analysis_failed",
    "summarization_failed",
]);
const POLL_INTERVAL = 5000;

export default function MeetingDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchMeeting = async () => {
        try {
            const data = await getMeeting(id);
            setMeeting(data);
            if (!POLL_STATUSES.has(data.status)) {
                if (timerRef.current) clearInterval(timerRef.current);
            }
        } catch {
            setError("Failed to load meeting.");
        }
    };

    useEffect(() => {
        fetchMeeting();
        timerRef.current = setInterval(fetchMeeting, POLL_INTERVAL);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [id]);

    const handleRetry = async () => {
        if (!meeting) return;
        try {
            await retryMeeting(meeting.id);
            timerRef.current = setInterval(fetchMeeting, POLL_INTERVAL);
        } catch {
            setError("Retry failed.");
        }
    };

    const handleDelete = async () => {
        if (!meeting) return;
        try {
            await deleteMeeting(meeting.id);
            router.push("/");
        } catch {
            setError("Delete failed.");
        }
    };

    if (!meeting) {
        return (
            <main className="mx-auto max-w-2xl px-4 py-8">
                {error ? (
                    <p className="text-sm text-red-600">{error}</p>
                ) : (
                    <p className="text-sm text-gray-500">Loading…</p>
                )}
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-gray-900">{meeting.title}</h1>
                    <div className="mt-1">
                        <StatusBadge status={meeting.status} />
                    </div>
                </div>
                <div className="flex gap-2">
                    {FAILED_STATUSES.has(meeting.status) && (
                        <button
                            onClick={handleRetry}
                            data-testid="retry-button"
                            className="rounded border border-red-300 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                            Retry
                        </button>
                    )}
                    <button
                        onClick={handleDelete}
                        className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                        Delete
                    </button>
                </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {meeting.transcript && (
                <section>
                    <h2 className="mb-2 text-sm font-medium text-gray-700">Transcript</h2>
                    <TranscriptView transcript={meeting.transcript} />
                </section>
            )}

            {meeting.sentiment && (
                <section>
                    <h2 className="mb-2 text-sm font-medium text-gray-700">Sentiment</h2>
                    <SentimentCard report={meeting.sentiment} />
                </section>
            )}

            {meeting.summary && (
                <section>
                    <h2 className="mb-2 text-sm font-medium text-gray-700">Summary</h2>
                    <SummaryCard summary={meeting.summary.content} />
                </section>
            )}

            {meeting.action_items.length > 0 && (
                <section>
                    <h2 className="mb-2 text-sm font-medium text-gray-700">Action Items</h2>
                    <ActionItemList items={meeting.action_items} />
                </section>
            )}
        </main>
    );
}
