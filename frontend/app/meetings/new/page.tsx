"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Recorder from "@/components/Recorder";
import Uploader from "@/components/Uploader";
import { createMeeting, uploadAudio } from "@/lib/api";

type Tab = "record" | "upload";

export default function NewMeetingPage() {
    const router = useRouter();
    const [tab, setTab] = useState<Tab>("record");
    const [title, setTitle] = useState("");
    const [meetingId, setMeetingId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const userId = "demo-user";

    const ensureMeeting = async (): Promise<string> => {
        if (meetingId) return meetingId;
        const meeting = await createMeeting(title || "Untitled Meeting", userId);
        setMeetingId(meeting.id);
        return meeting.id;
    };

    const handleRecordingComplete = async (blob: Blob) => {
        setError(null);
        setUploading(true);
        try {
            const id = await ensureMeeting();
            await uploadAudio(id, blob);
            router.push(`/meetings/${id}`);
        } catch {
            setError("Upload failed. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleUploadComplete = (id: string) => {
        router.push(`/meetings/${id}`);
    };

    return (
        <main className="mx-auto max-w-lg px-4 py-8">
            <h1 className="mb-6 text-xl font-semibold text-gray-900">New Meeting</h1>

            <input
                type="text"
                placeholder="Meeting title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />

            <div className="mb-4 flex gap-2 border-b border-gray-200">
                {(["record", "upload"] as Tab[]).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-4 py-2 text-sm capitalize ${tab === t
                                ? "border-b-2 border-blue-600 font-medium text-blue-600"
                                : "text-gray-500"
                            }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            {uploading && <p className="mb-3 text-sm text-gray-500">Uploading…</p>}

            {tab === "record" && (
                <Recorder onRecordingComplete={handleRecordingComplete} />
            )}
            {tab === "upload" && meetingId && (
                <Uploader
                    meetingId={meetingId}
                    onUploadComplete={handleUploadComplete}
                />
            )}
            {tab === "upload" && !meetingId && (
                <div className="p-4">
                    <button
                        onClick={async () => {
                            const id = await ensureMeeting();
                            setMeetingId(id);
                        }}
                        className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                    >
                        Start Upload
                    </button>
                </div>
            )}
        </main>
    );
}
