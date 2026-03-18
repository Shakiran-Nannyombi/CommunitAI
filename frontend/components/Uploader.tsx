"use client";

import { useRef, useState } from "react";

const ALLOWED_MIME = new Set([
    "audio/mpeg",
    "audio/wav",
    "audio/mp4",
    "audio/x-m4a",
    "audio/aac",
    "audio/x-aac",
]);
const ALLOWED_EXT = new Set([".mp3", ".wav", ".m4a", ".aac"]);
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB

export function validateAudioFile(file: File): string | null {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_MIME.has(file.type) && !ALLOWED_EXT.has(ext)) {
        return "Unsupported format. Please upload an MP3, WAV, M4A, or AAC file.";
    }
    if (file.size > MAX_BYTES) {
        return "File exceeds the 500 MB limit. Please compress or trim the recording.";
    }
    return null;
}

interface UploaderProps {
    meetingId: string;
    onUploadComplete: (meetingId: string) => void;
}

export default function Uploader({ meetingId, onUploadComplete }: UploaderProps) {
    const [progress, setProgress] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File) => {
        setError(null);
        const validationError = validateAudioFile(file);
        if (validationError) {
            setError(validationError);
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.open(
            "POST",
            `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/meetings/${meetingId}/upload`
        );

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                setProgress(Math.round((e.loaded / e.total) * 100));
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                setProgress(100);
                onUploadComplete(meetingId);
            } else {
                setError("Upload failed. Please try again.");
                setProgress(null);
            }
        };

        xhr.onerror = () => {
            setError("Upload failed. Please try again.");
            setProgress(null);
        };

        xhr.send(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    return (
        <div className="flex flex-col gap-3 p-4">
            <input
                ref={inputRef}
                type="file"
                accept=".mp3,.wav,.m4a,.aac"
                onChange={handleChange}
                className="text-sm text-gray-700"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            {progress !== null && (
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );
}
