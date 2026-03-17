"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMeetings, createMeeting, uploadAudio, type MeetingListItem } from "@/lib/api";

const USER_ID = "user-123"; // hardcoded until auth is added

const statusColor: Record<string, string> = {
    pending: "text-yellow-400",
    processing: "text-blue-400",
    transcribed: "text-blue-400",
    complete: "text-green-400",
    transcription_failed: "text-red-400",
    analysis_failed: "text-red-400",
    summarization_failed: "text-red-400",
};

export default function Dashboard() {
    const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");

    async function load() {
        try {
            const data = await getMeetings(USER_ID);
            setMeetings(data);
        } catch {
            setError("Failed to load meetings");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !file) return;
        setCreating(true);
        setError("");
        try {
            const meeting = await createMeeting(title.trim(), USER_ID);
            await uploadAudio(meeting.id, file);
            setTitle("");
            setFile(null);
            await load();
        } catch {
            setError("Failed to create meeting");
        } finally {
            setCreating(false);
        }
    }

    return (
        <main className="max-w-3xl mx-auto px-6 py-10">
            <h1 className="text-3xl font-bold text-green-400 mb-8">Meetings</h1>

            {/* Upload form */}
            <form onSubmit={handleCreate} className="mb-10 bg-zinc-900 border border-green-900 rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-semibold text-green-300">New Meeting</h2>
                <input
                    type="text"
                    placeholder="Meeting title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-green-600"
                    required
                />
                <input
                    type="file"
                    accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a"
                    onChange={e => setFile(e.target.files?.[0] ?? null)}
                    className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-800 file:text-green-100 hover:file:bg-green-700 cursor-pointer"
                    required
                />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                    type="submit"
                    disabled={creating}
                    className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition"
                >
                    {creating ? "Uploading…" : "Upload & Process"}
                </button>
            </form>

            {/* Meeting list */}
            {loading ? (
                <p className="text-zinc-500">Loading…</p>
            ) : meetings.length === 0 ? (
                <p className="text-zinc-500">No meetings yet. Upload one above.</p>
            ) : (
                <ul className="space-y-3">
                    {meetings.map(m => (
                        <li key={m.id}>
                            <Link
                                href={`/meetings/${m.id}`}
                                className="flex items-center justify-between bg-zinc-900 border border-zinc-800 hover:border-green-700 rounded-xl px-5 py-4 transition"
                            >
                                <div>
                                    <p className="font-medium text-white">{m.title}</p>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        {new Date(m.created_at).toLocaleString()}
                                    </p>
                                </div>
                                <span className={`text-sm font-semibold capitalize ${statusColor[m.status] ?? "text-zinc-400"}`}>
                                    {m.status.replace(/_/g, " ")}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}
