"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    createMeeting,
    uploadAudio,
    loadAuth,
    getWorkspaces,
    type Workspace,
} from "@/lib/api";

type RecordState = "idle" | "recording" | "preview";
type AudioMode = "microphone" | "system";

const MAX_BLOB_BYTES = 500 * 1024 * 1024; // 500 MB

export default function RecordPage() {
    const router = useRouter();

    // Support detection
    const [supported, setSupported] = useState<boolean | null>(null);

    // Auth / workspaces
    const [userId, setUserId] = useState("");
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [workspaceId, setWorkspaceId] = useState("");

    // Recording state
    const [recordState, setRecordState] = useState<RecordState>("idle");
    const [audioMode, setAudioMode] = useState<AudioMode>("system");
    const [elapsed, setElapsed] = useState(0);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [blob, setBlob] = useState<Blob | null>(null);

    // Upload form (both preview confirm and fallback)
    const [title, setTitle] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [sizeError, setSizeError] = useState("");

    // Fallback file upload
    const [fallbackFile, setFallbackFile] = useState<File | null>(null);

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Detect support and load auth on mount
    useEffect(() => {
        const isSupported = !!(
            typeof navigator !== "undefined" &&
            navigator.mediaDevices &&
            typeof navigator.mediaDevices.getDisplayMedia === "function"
        );
        setSupported(isSupported);

        const auth = loadAuth();
        if (!auth) { router.replace("/login"); return; }
        setUserId(auth.user_id);

        getWorkspaces(auth.user_id).then(setWorkspaces).catch(() => { });
    }, [router]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function formatElapsed(secs: number) {
        const m = Math.floor(secs / 60).toString().padStart(2, "0");
        const s = (secs % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    }

    async function startRecording() {
        setUploadError("");
        setSizeError("");
        chunksRef.current = [];

        try {
            let stream: MediaStream;
            if (audioMode === "system") {
                stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: false });
            } else {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }
            streamRef.current = stream;

            const mr = new MediaRecorder(stream);
            mediaRecorderRef.current = mr;

            mr.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mr.onstop = () => {
                const recorded = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
                const url = URL.createObjectURL(recorded);
                setBlob(recorded);
                setBlobUrl(url);
                setRecordState("preview");
                if (timerRef.current) clearInterval(timerRef.current);
            };

            // Stop recording if user ends screen share via browser UI
            stream.getTracks().forEach(track => {
                track.onended = () => {
                    if (mediaRecorderRef.current?.state === "recording") {
                        mediaRecorderRef.current.stop();
                    }
                };
            });

            mr.start(1000);
            setElapsed(0);
            setRecordState("recording");

            timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
        } catch (err: unknown) {
            const name = err instanceof Error ? err.name : "";
            if (name === "NotAllowedError") {
                setUploadError("Permission denied — please allow screen/microphone access.");
            } else {
                setUploadError("Could not start recording. Please try again.");
            }
        }
    }

    function stopRecording() {
        if (timerRef.current) clearInterval(timerRef.current);
        mediaRecorderRef.current?.stop();
        streamRef.current?.getTracks().forEach(t => t.stop());
    }

    function discardRecording() {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        setBlob(null);
        setBlobUrl(null);
        setTitle("");
        setSizeError("");
        setUploadError("");
        setElapsed(0);
        setRecordState("idle");
    }

    async function handleConfirmUpload() {
        if (!blob || !title.trim() || !userId) return;

        if (blob.size > MAX_BLOB_BYTES) {
            setSizeError("Recording exceeds 500 MB limit. Please discard and try a shorter recording.");
            return;
        }

        setUploading(true);
        setUploadError("");
        try {
            const meeting = await createMeeting(title.trim(), userId, workspaceId || undefined);
            await uploadAudio(meeting.id, blob);
            router.push(`/meetings/${meeting.id}`);
        } catch {
            setUploadError("Upload failed. Your recording is preserved — please try again.");
        } finally {
            setUploading(false);
        }
    }

    async function handleFallbackUpload(e: React.FormEvent) {
        e.preventDefault();
        if (!fallbackFile || !title.trim() || !userId) return;

        if (fallbackFile.size > MAX_BLOB_BYTES) {
            setSizeError("File exceeds 500 MB limit.");
            return;
        }

        setUploading(true);
        setUploadError("");
        setSizeError("");
        try {
            const meeting = await createMeeting(title.trim(), userId, workspaceId || undefined);
            await uploadAudio(meeting.id, fallbackFile);
            router.push(`/meetings/${meeting.id}`);
        } catch {
            setUploadError("Upload failed. Please try again.");
        } finally {
            setUploading(false);
        }
    }

    // Still detecting support
    if (supported === null) return null;

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <main className="flex-1 flex flex-col items-center justify-start p-10 max-w-3xl w-full mx-auto space-y-8">
                <div className="w-full">
                    <h1 className="text-3xl font-bold text-text tracking-tight">Record Meeting</h1>
                    <p className="text-text/50 mt-2">Capture your community discussions and generate instant insights.</p>
                </div>

                {/* ── Unsupported: error banner + fallback form ── */}
                {!supported && (
                    <>
                        <div className="w-full bg-red-950/40 border border-red-800 rounded px-4 py-3 text-xs text-red-400">
                            Your browser does not support screen recording (<code>getDisplayMedia</code> is unavailable).
                            Please use the file upload form below.
                        </div>
                        <FallbackForm
                            title={title}
                            setTitle={setTitle}
                            workspaces={workspaces}
                            workspaceId={workspaceId}
                            setWorkspaceId={setWorkspaceId}
                            fallbackFile={fallbackFile}
                            setFallbackFile={setFallbackFile}
                            uploading={uploading}
                            uploadError={uploadError}
                            sizeError={sizeError}
                            onSubmit={handleFallbackUpload}
                        />
                    </>
                )}

                {/* ── Supported: recorder UI ── */}
                {supported && (
                    <>
                        {/* ── IDLE: mode toggle + start button ── */}
                        {recordState === "idle" && (
                            <section className="w-full bg-background border border-text/10 rounded p-6 space-y-5">
                                <p className="text-xs text-text/50 uppercase tracking-widest">New Recording</p>

                                {uploadError && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded px-3 py-2 text-xs text-red-500">
                                        {uploadError}
                                    </div>
                                )}

                                {/* Audio mode toggle */}
                                <div>
                                    <p className="text-xs text-text/50 mb-2 uppercase tracking-widest">Audio Source</p>
                                    <div className="flex gap-2">
                                        {(["system", "microphone"] as AudioMode[]).map(mode => (
                                            <button
                                                key={mode}
                                                onClick={() => setAudioMode(mode)}
                                                className={`px-4 py-2 text-xs rounded border transition ${audioMode === mode
                                                    ? "border-accent text-accent bg-accent/10"
                                                    : "border-text/10 text-text/50 hover:border-text/20 hover:text-text/70"
                                                    }`}
                                            >
                                                {mode === "system" ? "🔊 System Audio" : "🎙 Microphone"}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-text/40 mt-2">
                                        {audioMode === "system"
                                            ? "Captures audio from your browser tab or system."
                                            : "Captures audio from your microphone only."}
                                    </p>
                                </div>

                                <button
                                    onClick={startRecording}
                                    className="w-full py-3 bg-accent hover:bg-accent/90 text-background font-bold text-xs uppercase tracking-widest rounded transition"
                                >
                                    ● Start Recording
                                </button>
                            </section>
                        )}

                        {/* ── RECORDING: timer + indicator + stop ── */}
                        {recordState === "recording" && (
                            <section className="w-full bg-background border border-text/10 rounded p-6 space-y-5 text-center">
                                <div className="flex items-center justify-center gap-3">
                                    <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" aria-label="Recording indicator" />
                                    <span className="text-red-500 text-xs uppercase tracking-widest">Recording</span>
                                </div>
                                <p className="text-4xl tabular-nums text-text font-bold" aria-label="Elapsed time">
                                    {formatElapsed(elapsed)}
                                </p>
                                <p className="text-xs text-text/40">
                                    {audioMode === "system" ? "🔊 System Audio" : "🎙 Microphone"}
                                </p>
                                <button
                                    onClick={stopRecording}
                                    className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-widest rounded transition"
                                >
                                    ■ Stop Recording
                                </button>
                            </section>
                        )}

                        {/* ── PREVIEW: video + confirm form ── */}
                        {recordState === "preview" && blob && blobUrl && (
                            <section className="w-full bg-background border border-text/10 rounded p-6 space-y-5">
                                <p className="text-xs text-text/50 uppercase tracking-widest">Preview &amp; Upload</p>

                                {/* Video preview */}
                                <video
                                    src={blobUrl}
                                    controls
                                    className="w-full rounded border border-text/10 bg-black max-h-64"
                                />

                                {/* Size error */}
                                {sizeError && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded px-3 py-2 text-xs text-red-500">
                                        {sizeError}
                                    </div>
                                )}

                                {/* Network error (preserves blob) */}
                                {uploadError && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded px-3 py-2 text-xs text-red-500">
                                        {uploadError}
                                    </div>
                                )}

                                <p className="text-xs text-text/40">
                                    Size: {(blob.size / (1024 * 1024)).toFixed(1)} MB
                                    {blob.size > MAX_BLOB_BYTES && (
                                        <span className="text-red-500 ml-2">— exceeds 500 MB limit</span>
                                    )}
                                </p>

                                {/* Title input */}
                                <div>
                                    <label className="block text-xs text-text/50 mb-1.5 uppercase tracking-widest">
                                        Meeting Title
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="e.g. Weekly Sync"
                                        required
                                        className="w-full bg-text/5 border border-text/10 rounded px-3 py-2 text-xs text-text placeholder-text/20 focus:outline-none focus:border-accent transition"
                                    />
                                </div>

                                {/* Workspace selector */}
                                <WorkspaceSelector
                                    workspaces={workspaces}
                                    workspaceId={workspaceId}
                                    setWorkspaceId={setWorkspaceId}
                                />

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleConfirmUpload}
                                        disabled={uploading || !title.trim()}
                                        className="flex-1 py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-background font-bold text-xs uppercase tracking-widest rounded transition"
                                    >
                                        {uploading ? "Uploading..." : "Confirm & Upload"}
                                    </button>
                                    <button
                                        onClick={discardRecording}
                                        disabled={uploading}
                                        className="px-5 border border-text/10 hover:border-text/20 text-text/50 hover:text-text/70 text-xs rounded transition"
                                    >
                                        Discard
                                    </button>
                                </div>
                            </section>
                        )}

                        {/* Fallback file upload — always accessible */}
                        {recordState === "idle" && (
                            <details className="w-full group">
                                <summary className="text-xs text-zinc-600 hover:text-zinc-400 cursor-pointer select-none uppercase tracking-widest">
                                    ↳ Upload a file instead
                                </summary>
                                <div className="mt-3">
                                    <FallbackForm
                                        title={title}
                                        setTitle={setTitle}
                                        workspaces={workspaces}
                                        workspaceId={workspaceId}
                                        setWorkspaceId={setWorkspaceId}
                                        fallbackFile={fallbackFile}
                                        setFallbackFile={setFallbackFile}
                                        uploading={uploading}
                                        uploadError={uploadError}
                                        sizeError={sizeError}
                                        onSubmit={handleFallbackUpload}
                                    />
                                </div>
                            </details>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

// ── Sub-components ──────────────────────────────────────────────────────────

interface WorkspaceSelectorProps {
    workspaces: Workspace[];
    workspaceId: string;
    setWorkspaceId: (id: string) => void;
}

function WorkspaceSelector({ workspaces, workspaceId, setWorkspaceId }: WorkspaceSelectorProps) {
    if (workspaces.length === 0) return null;
    return (
        <div>
            <label className="block text-xs text-text/50 mb-1.5 uppercase tracking-widest">
                Workspace (optional)
            </label>
            <select
                value={workspaceId}
                onChange={e => setWorkspaceId(e.target.value)}
                className="w-full bg-text/5 border border-text/10 rounded px-3 py-2 text-xs text-text focus:outline-none focus:border-accent transition appearance-none"
            >
                <option value="">— None —</option>
                {workspaces.map(ws => (
                    <option key={ws.id} value={ws.id} className="bg-background">
                        {ws.icon_emoji} {ws.name}
                    </option>
                ))}
            </select>
        </div>
    );
}

interface FallbackFormProps {
    title: string;
    setTitle: (v: string) => void;
    workspaces: Workspace[];
    workspaceId: string;
    setWorkspaceId: (v: string) => void;
    fallbackFile: File | null;
    setFallbackFile: (f: File | null) => void;
    uploading: boolean;
    uploadError: string;
    sizeError: string;
    onSubmit: (e: React.FormEvent) => void;
}

function FallbackForm({
    title, setTitle,
    workspaces, workspaceId, setWorkspaceId,
    fallbackFile, setFallbackFile,
    uploading, uploadError, sizeError,
    onSubmit,
}: FallbackFormProps) {
    return (
        <form onSubmit={onSubmit} className="w-full bg-background border border-text/10 rounded p-6 space-y-4">
            <p className="text-xs text-text/50 uppercase tracking-widest">Upload Audio / Video File</p>

            {(uploadError || sizeError) && (
                <div className="bg-red-500/10 border border-red-500/20 rounded px-3 py-1 text-xs text-red-500">
                    {sizeError || uploadError}
                </div>
            )}

            <div>
                <label className="block text-xs text-text/50 mb-1.5 uppercase tracking-widest">
                    Meeting Title
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Weekly Sync"
                    required
                    className="w-full bg-text/5 border border-text/10 rounded px-3 py-2 text-xs text-text placeholder-text/20 focus:outline-none focus:border-accent transition"
                />
            </div>

            <div>
                <label className="block text-xs text-text/50 mb-1.5 uppercase tracking-widest">
                    Audio / Video File
                </label>
                <input
                    type="file"
                    accept="audio/*,video/*"
                    required
                    onChange={e => setFallbackFile(e.target.files?.[0] ?? null)}
                    className="w-full text-xs text-text/40 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-text/10 file:text-text/70 hover:file:bg-text/20 transition"
                />
                {fallbackFile && (
                    <p className="text-xs text-text/30 mt-1">
                        {fallbackFile.name} — {(fallbackFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                )}
            </div>

            <WorkspaceSelector
                workspaces={workspaces}
                workspaceId={workspaceId}
                setWorkspaceId={setWorkspaceId}
            />

            <button
                type="submit"
                disabled={uploading || !title.trim() || !fallbackFile}
                className="w-full py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-background font-bold text-xs uppercase tracking-widest rounded transition"
            >
                {uploading ? "Uploading..." : "Upload"}
            </button>
        </form>
    );
}
