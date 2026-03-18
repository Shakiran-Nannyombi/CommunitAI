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
            setSizeError("Recording exceeds 500 MB limit.");
            return;
        }

        setUploading(true);
        setUploadError("");
        try {
            const meeting = await createMeeting(title.trim(), userId, workspaceId || undefined);
            await uploadAudio(meeting.id, blob);
            router.push(`/meetings/${meeting.id}`);
        } catch {
            setUploadError("Upload failed. Recording preserved.");
        } finally {
            setUploading(false);
        }
    }

    if (supported === null) return null;

    return (
        <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto px-6 lg:px-20 py-12">
            <div className="max-w-4xl mx-auto w-full">
                {/* IDLE STATE */}
                {recordState === "idle" && (
                    <div className="space-y-12">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-accent/10 rounded-2xl text-accent">
                                    <Mic className="w-8 h-8" />
                                </div>
                                <h1 className="text-4xl font-black text-text tracking-tight">Record Meeting</h1>
                            </div>
                            <p className="text-xl text-text/50 font-medium">Capture community discussions seamlessly.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Native Recorder Card */}
                            <div className={`p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${supported ? 'border-accent/20 bg-accent/3 group hover:border-accent/40' : 'border-text/5 bg-text/2 opacity-50 grayscale'}`}>
                                <h3 className="text-xl font-black mb-4">Native Recorder</h3>
                                <p className="text-sm text-text/50 mb-8 font-medium italic">High-fidelity capture directly from your browser.</p>
                                
                                <div className="space-y-6">
                                    <div className="flex gap-3">
                                        {(["system", "microphone"] as AudioMode[]).map(mode => (
                                            <button
                                                key={mode}
                                                disabled={!supported}
                                                onClick={() => setAudioMode(mode)}
                                                className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ${
                                                    audioMode === mode 
                                                        ? 'bg-accent text-background border-accent shadow-lg shadow-accent/20' 
                                                        : 'bg-background text-text/40 border-text/10'
                                                }`}
                                            >
                                                {mode === "system" ? <span className="flex items-center justify-center gap-2"><Monitor className="w-3.5 h-3.5" /> System</span> 
                                                                   : <span className="flex items-center justify-center gap-2"><Radio className="w-3.5 h-3.5" /> Mic Only</span>}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        disabled={!supported}
                                        onClick={startRecording}
                                        className="w-full py-5 bg-text text-background rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 group"
                                    >
                                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                                        Start Capturing
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                                {!supported && <p className="mt-4 text-[10px] text-red-400 font-black uppercase text-center">Browser unsupported</p>}
                            </div>

                            {/* Upload Card */}
                            <div className="p-8 rounded-[2.5rem] border-2 border-text/5 bg-text/2 group hover:border-text/10 transition-all duration-500">
                                <h3 className="text-xl font-black mb-4">Manual Upload</h3>
                                <p className="text-sm text-text/50 mb-8 font-medium">Already have a file? Upload it for instant AI analysis.</p>
                                
                                <label className="cursor-pointer block">
                                    <div className="w-full py-16 border-2 border-dashed border-text/10 rounded-2xl flex flex-col items-center justify-center gap-4 group-hover:border-accent/40 transition-colors">
                                        <div className="p-4 bg-text/5 rounded-full text-text/20 group-hover:text-accent group-hover:bg-accent/10 transition-colors">
                                            <Upload className="w-8 h-8" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-text/40">Drop audio here</p>
                                    </div>
                                    <input type="file" className="hidden" accept="audio/*,video/*" onChange={e => {
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
                    <div className="space-y-12">
                        <div className="flex justify-between items-end">
                            <div>
                                <h1 className="text-4xl font-black text-text tracking-tight">Review Record</h1>
                                <p className="text-xl text-text/50 font-medium mt-2">Add details before we start the analysis.</p>
                            </div>
                            <button onClick={discardRecording} className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                            <div className="lg:col-span-3 space-y-8">
                                <div className="bg-text/5 rounded-4xl p-1 overflow-hidden border border-text/10 aspect-video flex items-center justify-center relative shadow-inner">
                                    <video src={blobUrl} controls className="max-h-full max-w-full" />
                                </div>

                                <div className="flex items-center gap-8 px-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-text/30 tracking-widest mb-1">Duration</p>
                                        <p className="text-xl font-black">{formatElapsed(elapsed)}</p>
                                    </div>
                                    <div className="w-px h-10 bg-text/10"></div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-text/30 tracking-widest mb-1">File Size</p>
                                        <p className="text-xl font-black">{(blob?.size || 0) / 1024 > 1024 ? `${((blob?.size || 0) / (1024 * 1024)).toFixed(1)} MB` : `${((blob?.size || 0) / 1024).toFixed(0)} KB`}</p>
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
                                    className="w-full py-5 bg-accent text-background rounded-3xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-accent/20 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                    {uploading ? 'Processing AI...' : 'Analyze Record'}
                                </button>

                                {sizeError && <p className="text-[10px] text-red-500 font-bold uppercase text-center">{sizeError}</p>}
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
