"use client";

import { useEffect, useRef, useState } from "react";

interface RecorderProps {
    onRecordingComplete: (blob: Blob) => void;
}

type RecordingState = "idle" | "recording" | "paused";

export default function Recorder({ onRecordingComplete }: RecorderProps) {
    const [state, setState] = useState<RecordingState>("idle");
    const [elapsed, setElapsed] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const startTimer = () => {
        timerRef.current = setInterval(
            () => setElapsed((s) => s + 1),
            1000
        );
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60)
            .toString()
            .padStart(2, "0");
        const sec = (s % 60).toString().padStart(2, "0");
        return `${m}:${sec}`;
    };

    const handleStart = async () => {
        setError(null);
        chunksRef.current = [];
        setElapsed(0);

        if (!navigator.mediaDevices?.getUserMedia) {
            setError(
                "Your browser doesn't support recording. Please use Chrome or Firefox."
            );
            return;
        }

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === "NotAllowedError") {
                setError(
                    "Microphone access is required to record. Please allow access in your browser settings."
                );
            } else {
                setError(
                    "Your browser doesn't support recording. Please use Chrome or Firefox."
                );
            }
            return;
        }

        const mr = new MediaRecorder(stream);
        mediaRecorderRef.current = mr;

        mr.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mr.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: "audio/webm" });
            onRecordingComplete(blob);
            stream.getTracks().forEach((t) => t.stop());
        };

        mr.start();
        setState("recording");
        startTimer();
    };

    const handlePause = () => {
        mediaRecorderRef.current?.pause();
        setState("paused");
        stopTimer();
    };

    const handleResume = () => {
        mediaRecorderRef.current?.resume();
        setState("recording");
        startTimer();
    };

    const handleStop = () => {
        mediaRecorderRef.current?.stop();
        setState("idle");
        stopTimer();
    };

    return (
        <div className="flex flex-col items-center gap-4 p-4">
            {state === "recording" && (
                <span className="flex items-center gap-2 text-sm text-red-600">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    Recording
                </span>
            )}
            <span className="font-mono text-2xl">{formatTime(elapsed)}</span>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2">
                {state === "idle" && (
                    <button
                        onClick={handleStart}
                        className="rounded bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600"
                    >
                        Record
                    </button>
                )}
                {state === "recording" && (
                    <>
                        <button
                            onClick={handlePause}
                            className="rounded bg-yellow-500 px-4 py-2 text-sm text-white hover:bg-yellow-600"
                        >
                            Pause
                        </button>
                        <button
                            onClick={handleStop}
                            className="rounded bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-800"
                        >
                            Stop
                        </button>
                    </>
                )}
                {state === "paused" && (
                    <>
                        <button
                            onClick={handleResume}
                            className="rounded bg-green-500 px-4 py-2 text-sm text-white hover:bg-green-600"
                        >
                            Resume
                        </button>
                        <button
                            onClick={handleStop}
                            className="rounded bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-800"
                        >
                            Stop
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
