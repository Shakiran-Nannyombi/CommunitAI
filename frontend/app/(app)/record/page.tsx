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
import {
    Mic, Monitor, StopCircle, Radio,
    ArrowRight, CheckCircle2, AlertCircle,
    X, Upload, Loader2, Sparkles, LayoutDashboard
} from "lucide-react";

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

    // Upload form
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

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    }, [blobUrl]);

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
                // getDisplayMedia requires video:true in most browsers
                // We capture with video then immediately remove video tracks
                const displayStream = await navigator.mediaDevices.getDisplayMedia({
                    audio: true,
                    video: true
                });
                // Remove video tracks — we only want audio
                displayStream.getVideoTracks().forEach(t => t.stop());
                const audioTracks = displayStream.getAudioTracks();
                if (audioTracks.length === 0) {
                    setUploadError("No audio captured. Make sure to check 'Share audio' or 'Share tab audio' in the browser dialog.");
                    return;
                }
                stream = new MediaStream(audioTracks);
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
            if (name === "NotAllowedError" || name === "PermissionDeniedError") {
                setUploadError("Permission denied. Please allow microphone/screen access and try again.");
            } else if (name === "NotSupportedError") {
                setUploadError("Your browser doesn't support this recording mode. Try 'Mic Only' or use Manual Upload instead.");
            } else if (name === "NotFoundError") {
                setUploadError("No microphone found. Please connect a microphone and try again.");
            } else {
                setUploadError("Could not start recording — try 'Mic Only' mode or use Manual Upload.");
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
            setSizeError("Recording exceeds 500 MB limit.");
            return;
        }

        setUploading(true);
        setUploadError("");
        try {
            const meeting = await createMeeting(title.trim(), userId, workspaceId || undefined);
            await uploadAudio(meeting.id, blob);
            router.push(`/meetings/${meeting.id}`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Upload failed.";
            // Try to extract backend detail
            const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            setUploadError(detail || msg);
        } finally {
            setUploading(false);
        }
    }

    if (supported === null) return null;

    return (
        <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto px-5 sm:px-10 lg:px-16 xl:px-20 py-8 lg:py-20 relative">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-accent/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="max-w-5xl mx-auto w-full relative z-10">
                {/* IDLE STATE */}
                {recordState === "idle" && (
                    <div className="space-y-12">
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 sm:gap-6">
                                <div className="p-3 sm:p-4 bg-accent/10 border border-accent/20 rounded-3xl text-accent shadow-2xl shadow-accent/5">
                                    <Mic className="w-6 h-6 sm:w-8 sm:h-8" />
                                </div>
                                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-text tracking-tighter">Record Meeting</h1>
                            </div>
                            <p className="text-base sm:text-xl text-text/40 font-semibold leading-relaxed">Capture community discussions seamlessly with local intelligence.</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                            {/* Native Recorder Card */}
                            <div className="glass-card rounded-4xl p-6 sm:p-10 border-2 border-accent/20 bg-accent/3 transition-all duration-700 shadow-premium hover:shadow-premium-hover group select-none">
                                <h3 className="text-xl sm:text-2xl font-black text-text mb-4 tracking-tight">Native Recorder</h3>
                                <p className="text-sm text-text/40 mb-6 sm:mb-10 font-semibold italic leading-relaxed">High-fidelity capture directly from your browser's internal engine.</p>

                                <div className="space-y-6">
                                    <div className="flex gap-3">
                                        {(["system", "microphone"] as AudioMode[]).map(mode => (
                                            <button
                                                key={mode}
                                                onClick={() => setAudioMode(mode)}
                                                className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ${audioMode === mode
                                                    ? 'bg-accent text-background border-accent shadow-lg shadow-accent/20'
                                                    : 'bg-background text-text/40 border-text/10'
                                                    }`}
                                            >
                                                {mode === "system"
                                                    ? <span className="flex items-center justify-center gap-2"><Monitor className="w-3.5 h-3.5" /> System</span>
                                                    : <span className="flex items-center justify-center gap-2"><Radio className="w-3.5 h-3.5" /> Mic Only</span>}
                                            </button>
                                        ))}
                                    </div>

                                    {audioMode === "system" && (
                                        <p className="text-[10px] text-text/30 font-bold text-center -mt-2">
                                            Chrome only · check &quot;Share audio&quot; in the dialog
                                        </p>
                                    )}

                                    <button
                                        onClick={startRecording}
                                        className="w-full py-5 bg-text text-background rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 group"
                                    >
                                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                                        Start Capturing
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>

                            {/* Upload Card */}
                            <div className="glass-card rounded-4xl p-6 sm:p-10 shadow-premium hover:shadow-premium-hover transition-all duration-700 group cursor-pointer border-transparent hover:border-accent/20">
                                <h3 className="text-xl sm:text-2xl font-black text-text mb-4 tracking-tight">Manual Upload</h3>
                                <p className="text-sm text-text/40 mb-6 sm:mb-10 font-semibold leading-relaxed">Already have a file? Upload it for instant AI analysis and synthesis.</p>

                                <label className="cursor-pointer block">
                                    <div className="w-full py-20 border-2 border-dashed border-text/10 rounded-3xl flex flex-col items-center justify-center gap-6 group-hover:border-accent/40 transition-all duration-700 bg-text/2">
                                        <div className="p-6 bg-background rounded-full text-text/10 group-hover:text-accent group-hover:bg-accent/10 transition-all duration-500 shadow-sm">
                                            <Upload className="w-10 h-10" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text/30">Drop audio here</p>
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-text/20">MP3 · WAV · M4A · AAC · OGG · WEBM · MP4</p>
                                    </div>
                                    <input type="file" className="hidden" accept="audio/*,video/mp4,video/webm" onChange={e => {
                                        const f = e.target.files?.[0];
                                        if (f) { setFallbackFile(f); setRecordState("preview"); setBlob(f); setBlobUrl(URL.createObjectURL(f)); }
                                    }} />
                                </label>
                            </div>
                        </div>

                        {uploadError && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold flex items-center gap-3">
                                <AlertCircle className="w-4 h-4" />
                                {uploadError}
                            </div>
                        )}
                    </div>
                )}

                {/* RECORDING STATE */}
                {recordState === "recording" && (
                    <div className="flex flex-col items-center justify-center py-20 space-y-12">
                        <div className="relative">
                            <div className="absolute inset-0 bg-red-500/20 rounded-full blur-[80px] animate-pulse"></div>
                            <div className="relative w-64 h-64 rounded-full border-12 border-text/5 flex items-center justify-center bg-background shadow-2xl">
                                <span className="text-6xl font-black tabular-nums tracking-tighter text-text">
                                    {formatElapsed(elapsed)}
                                </span>
                            </div>
                            <div className="absolute top-0 right-0 p-3 bg-red-500 text-white rounded-full flex items-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-lg animate-bounce">
                                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                LIVE
                            </div>
                        </div>

                        <div className="text-center">
                            <h2 className="text-2xl font-black text-text mb-2">Capturing Audio...</h2>
                            <p className="text-text/50 font-medium">Keep this tab open for the best quality.</p>
                        </div>

                        <button
                            onClick={stopRecording}
                            className="px-12 py-5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 flex items-center gap-3 group transition-all"
                        >
                            <StopCircle className="w-5 h-5" />
                            Stop Recording
                        </button>
                    </div>
                )}

                {/* PREVIEW STATE */}
                {recordState === "preview" && blobUrl && (
                    <div className="space-y-8 sm:space-y-12">
                        <div className="flex justify-between items-start sm:items-end gap-6 sm:gap-12">
                            <div className="space-y-2 sm:space-y-4">
                                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-text tracking-tighter">Review Record</h1>
                                <p className="text-base sm:text-xl text-text/40 font-semibold">Add details before we start the analysis.</p>
                            </div>
                            <button onClick={discardRecording} className="p-4 sm:p-6 bg-red-500/10 text-red-500 rounded-3xl hover:bg-red-500 hover:text-white transition-all duration-500 shadow-xl shadow-red-500/5 shrink-0">
                                <X className="w-6 h-6 sm:w-8 sm:h-8" />
                            </button>
                        </div>                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-16">
                            <div className="lg:col-span-3 space-y-12">
                                <div className="glass-card rounded-[3rem] p-2 overflow-hidden relative shadow-premium group">
                                    <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    <video src={blobUrl} controls className="w-full aspect-video rounded-[2.8rem] bg-black" />
                                </div>

                                <div className="flex items-center gap-6 sm:gap-12 px-4 sm:px-6">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-text/20 tracking-[0.2em] mb-2">Duration</p>
                                        <p className="text-2xl sm:text-3xl font-black tabular-nums">{formatElapsed(elapsed)}</p>
                                    </div>
                                    <div className="w-px h-12 bg-text/5"></div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-text/20 tracking-[0.2em] mb-2">File Size</p>
                                        <p className="text-2xl sm:text-3xl font-black tabular-nums">{(blob?.size || 0) / 1024 > 1024 ? `${((blob?.size || 0) / (1024 * 1024)).toFixed(1)} MB` : `${((blob?.size || 0) / 1024).toFixed(0)} KB`}</p>
                                    </div>
                                </div>
                            </div>

                            <form className="lg:col-span-2 space-y-8" onSubmit={(e) => { e.preventDefault(); handleConfirmUpload(); }}>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-text/40 ml-1">Meeting Title</label>
                                    <input
                                        autoFocus
                                        value={title} onChange={e => setTitle(e.target.value)} required
                                        placeholder="e.g. Planning Committee Sync"
                                        className="w-full bg-text/5 border border-text/10 rounded-2xl px-5 py-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all placeholder:text-text/20"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-text/40 ml-1">Workspace Target</label>
                                    <select
                                        value={workspaceId} onChange={e => setWorkspaceId(e.target.value)}
                                        className="w-full bg-text/5 border border-text/10 rounded-2xl px-5 py-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all appearance-none"
                                    >
                                        <option value="" className="bg-background">General (No Workspace)</option>
                                        {workspaces.map(ws => (
                                            <option key={ws.id} value={ws.id} className="bg-background">{ws.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={uploading || !title.trim()}
                                    className="w-full py-6 bg-accent text-background rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-accent/20 flex items-center justify-center gap-4 disabled:opacity-50"
                                >
                                    {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                                    {uploading ? 'PROCESSING AI...' : 'ANALYZE RECORD'}
                                </button>

                                {sizeError && <p className="text-[10px] text-red-500 font-bold uppercase text-center">{sizeError}</p>}
                                {uploadError && <p className="text-[10px] text-red-500 font-bold uppercase text-center">{uploadError}</p>}
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
