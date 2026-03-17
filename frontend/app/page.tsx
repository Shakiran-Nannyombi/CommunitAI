"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MeetingList from "@/components/MeetingList";
import ActionItemList from "@/components/ActionItemList";
import { getMeetings, retryMeeting } from "@/lib/api";
import type { ActionItem, MeetingListItem } from "@/lib/api";

const FAILED_STATUSES = new Set([
    "transcription_failed",
    "analysis_failed",
    "summarization_failed",
]);

const POLL_INTERVAL = 5000;

export default function Dashboard() {
    const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
    const [allActionItems, setAllActionItems] = useState<ActionItem[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Hard-coded user_id for demo; replace with auth context in production
    const userId = "demo-user";

    const fetchMeetings = async () => {
        try {
            const data = await getMeetings(userId);
            setMeetings(data);
        } catch {
            // silently ignore polling errors
        }
    };

    useEffect(() => {
        fetchMeetings();
        timerRef.current = setInterval(fetchMeetings, POLL_INTERVAL);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const handleRetry = async (id: string) => {
        try {
            await retryMeeting(id);
        } catch {
            // ignore
        }
    };

    return (
        <main className="mx-auto max-w-2xl px-4 py-8">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-900">Meetings</h1>
                <Link
                    href="/meetings/new"
                    className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                >
                    New Meeting
                </Link>
            </div>

            <section className="mb-8">
                <MeetingList meetings={meetings} />
                {meetings
                    .filter((m) => FAILED_STATUSES.has(m.status))
                    .map((m) => (
                        <button
                            key={m.id}
                            data-testid={`retry-${m.id}`}
                            onClick={() => handleRetry(m.id)}
                            className="mt-2 rounded border border-red-300 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                            Retry "{m.title}"
                        </button>
                    ))}
            </section>

            {allActionItems.length > 0 && (
                <section>
                    <h2 className="mb-3 text-sm font-medium text-gray-700">
                        Pending Action Items
                    </h2>
                    <ActionItemList items={allActionItems} />
                </section>
            )}
        </main>
    );
}
