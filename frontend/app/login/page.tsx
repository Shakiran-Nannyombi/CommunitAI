"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register, demoLogin, saveAuth } from "@/lib/api";

type Mode = "login" | "register";

export default function AuthPage() {
    const router = useRouter();
    const [mode, setMode] = useState<Mode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const user = mode === "login"
                ? await login(email, password)
                : await register(email, password, name);
            saveAuth(user);
            router.push("/dashboard");
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { detail?: string } } })
                ?.response?.data?.detail;
            setError(msg ?? "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    async function handleDemo() {
        setError("");
        setLoading(true);
        try {
            const user = await demoLogin();
            saveAuth(user);
            router.push("/dashboard");
        } catch {
            setError("Could not load demo account");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ minHeight: "100dvh", fontSize: "14px" }} className="bg-black flex items-center justify-center font-mono p-6">
            {/* Scanline overlay */}
            <div className="fixed inset-0 pointer-events-none scanline opacity-20" />

            <div className="w-full relative z-10" style={{ maxWidth: "400px" }}>
                {/* Header */}
                <div className="mb-10 text-center">
                    <p style={{ fontSize: "22px", letterSpacing: "0.3em" }} className="text-green-400 font-bold uppercase">
                        CommunitAI
                    </p>
                    <p style={{ fontSize: "11px", letterSpacing: "0.2em" }} className="text-zinc-500 mt-2 uppercase">
                        AI Chief of Staff
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-2" style={{ fontSize: "11px" }}>
                        <span className="w-2 h-2 rounded-full bg-green-500 pulse-dot inline-block" />
                        <span className="text-zinc-600 tracking-widest">SYSTEM ONLINE</span>
                    </div>
                </div>

                {/* Card */}
                <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #1f1f1f", background: "#050505" }}>
                    {/* Tab bar */}
                    <div style={{ borderBottom: "1px solid #1a1a1a", background: "#0a0a0a", padding: "0 16px" }} className="flex">
                        {(["login", "register"] as Mode[]).map(m => (
                            <button
                                key={m}
                                onClick={() => { setMode(m); setError(""); }}
                                style={{
                                    fontSize: "11px",
                                    letterSpacing: "0.15em",
                                    padding: "12px 16px",
                                    borderBottom: mode === m ? "2px solid #22c55e" : "2px solid transparent",
                                    color: mode === m ? "#4ade80" : "#52525b",
                                    background: "none",
                                    cursor: "pointer",
                                    transition: "color 0.15s",
                                }}
                            >
                                {m === "login" ? "SIGN IN" : "REGISTER"}
                            </button>
                        ))}
                    </div>

                    <div style={{ padding: "24px" }}>
                        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {mode === "register" && (
                                <div>
                                    <label style={{ display: "block", fontSize: "11px", letterSpacing: "0.15em", color: "#52525b", marginBottom: "6px" }}>
                                        DISPLAY NAME
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Your name"
                                        style={{
                                            width: "100%", background: "#000", border: "1px solid #27272a",
                                            borderRadius: "4px", padding: "10px 12px", fontSize: "13px",
                                            color: "#d4d4d8", outline: "none", fontFamily: "inherit",
                                        }}
                                        onFocus={e => e.target.style.borderColor = "#166534"}
                                        onBlur={e => e.target.style.borderColor = "#27272a"}
                                    />
                                </div>
                            )}

                            <div>
                                <label style={{ display: "block", fontSize: "11px", letterSpacing: "0.15em", color: "#52525b", marginBottom: "6px" }}>
                                    EMAIL
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    style={{
                                        width: "100%", background: "#000", border: "1px solid #27272a",
                                        borderRadius: "4px", padding: "10px 12px", fontSize: "13px",
                                        color: "#d4d4d8", outline: "none", fontFamily: "inherit",
                                    }}
                                    onFocus={e => e.target.style.borderColor = "#166534"}
                                    onBlur={e => e.target.style.borderColor = "#27272a"}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "11px", letterSpacing: "0.15em", color: "#52525b", marginBottom: "6px" }}>
                                    PASSWORD
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    style={{
                                        width: "100%", background: "#000", border: "1px solid #27272a",
                                        borderRadius: "4px", padding: "10px 12px", fontSize: "13px",
                                        color: "#d4d4d8", outline: "none", fontFamily: "inherit",
                                    }}
                                    onFocus={e => e.target.style.borderColor = "#166534"}
                                    onBlur={e => e.target.style.borderColor = "#27272a"}
                                />
                            </div>

                            {error && (
                                <p style={{ fontSize: "12px", color: "#f87171", border: "1px solid #450a0a", background: "#0f0000", borderRadius: "4px", padding: "10px 12px" }}>
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: "100%", background: loading ? "#14532d" : "#15803d",
                                    border: "none", borderRadius: "4px", padding: "12px",
                                    fontSize: "12px", fontWeight: "700", letterSpacing: "0.15em",
                                    color: "#000", cursor: loading ? "not-allowed" : "pointer",
                                    fontFamily: "inherit", transition: "background 0.15s",
                                }}
                                onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.background = "#16a34a"; }}
                                onMouseLeave={e => { if (!loading) (e.target as HTMLButtonElement).style.background = "#15803d"; }}
                            >
                                {loading ? "CONNECTING..." : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
                            </button>
                        </form>

                        {/* Divider */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
                            <div style={{ flex: 1, borderTop: "1px solid #18181b" }} />
                            <span style={{ fontSize: "11px", color: "#3f3f46" }}>or</span>
                            <div style={{ flex: 1, borderTop: "1px solid #18181b" }} />
                        </div>

                        <button
                            onClick={handleDemo}
                            disabled={loading}
                            style={{
                                width: "100%", background: "none",
                                border: "1px solid #27272a", borderRadius: "4px", padding: "12px",
                                fontSize: "12px", letterSpacing: "0.15em", fontWeight: "600",
                                color: "#71717a", cursor: loading ? "not-allowed" : "pointer",
                                fontFamily: "inherit", transition: "all 0.15s",
                            }}
                            onMouseEnter={e => {
                                const b = e.currentTarget;
                                b.style.borderColor = "#166534";
                                b.style.color = "#4ade80";
                            }}
                            onMouseLeave={e => {
                                const b = e.currentTarget;
                                b.style.borderColor = "#27272a";
                                b.style.color = "#71717a";
                            }}
                        >
                            {loading ? "CONNECTING..." : "⚡  TRY DEMO ACCOUNT"}
                        </button>
                        <p style={{ fontSize: "11px", color: "#3f3f46", textAlign: "center", marginTop: "8px" }}>
                            Pre-loaded with sample meetings &amp; tasks
                        </p>
                    </div>
                </div>

                <p style={{ fontSize: "10px", color: "#27272a", textAlign: "center", marginTop: "24px", letterSpacing: "0.2em" }}>
                    COMMUNITAI · SECURE SESSION
                </p>
            </div>
        </div>
    );
}
