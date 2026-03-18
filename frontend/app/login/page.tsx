"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register, demoLogin, saveAuth } from "@/lib/api";
import { LogoMark } from "@/components/Logo";

type Mode = "login" | "register";

const INPUT_STYLE: React.CSSProperties = {
    width: "100%", background: "var(--background)", border: "1px solid color-mix(in srgb, var(--text), transparent 90%)",
    borderRadius: "4px", padding: "10px 12px", fontSize: "14px",
    color: "var(--text)", outline: "none", fontFamily: "inherit",
};
const LABEL_STYLE: React.CSSProperties = {
    display: "block", fontSize: "11px", letterSpacing: "0.15em",
    color: "color-mix(in srgb, var(--text), transparent 60%)", marginBottom: "6px",
};

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
        setError(""); setLoading(true);
        try {
            const user = mode === "login"
                ? await login(email, password)
                : await register(email, password, name);
            saveAuth(user);
            router.push("/dashboard");
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            setError(msg ?? "Something went wrong");
        } finally { setLoading(false); }
    }

    async function handleDemo() {
        setError(""); setLoading(true);
        try {
            const user = await demoLogin();
            saveAuth(user);
            router.push("/dashboard");
        } catch { setError("Could not load demo account"); }
        finally { setLoading(false); }
    }

    return (
        <div className="app-root" style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
            {/* Scanline overlay */}
            <div className="fixed inset-0 pointer-events-none scanline opacity-20" />

            <div style={{ width: "100%", maxWidth: "400px", position: "relative", zIndex: 10 }}>
                {/* Header */}
                <div style={{ marginBottom: "40px", textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
                        <LogoMark size={48} />
                    </div>
                    <p style={{ fontSize: "20px", letterSpacing: "0.3em", color: "var(--accent)", fontWeight: 800, textTransform: "uppercase" }}>
                        CommunitAI
                    </p>
                    <p style={{ fontSize: "11px", letterSpacing: "0.2em", color: "color-mix(in srgb, var(--text), transparent 60%)", marginTop: "6px", textTransform: "uppercase" }}>
                        AI Chief of Staff
                    </p>
                    <div style={{ marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "11px" }}>
                        <span className="pulse-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
                        <span style={{ color: "color-mix(in srgb, var(--text), transparent 70%)", letterSpacing: "0.2em" }}>SYSTEM ONLINE</span>
                    </div>
                </div>

                {/* Card */}
                <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid color-mix(in srgb, var(--text), transparent 90%)", background: "var(--background)", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)" }}>
                    {/* Tab bar */}
                    <div style={{ borderBottom: "1px solid color-mix(in srgb, var(--text), transparent 90%)", background: "color-mix(in srgb, var(--text), transparent 95%)", padding: "0 16px", display: "flex" }}>
                        {(["login", "register"] as Mode[]).map(m => (
                            <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
                                fontSize: "11px", letterSpacing: "0.15em", padding: "12px 16px",
                                borderBottom: mode === m ? "2px solid var(--accent)" : "2px solid transparent",
                                color: mode === m ? "var(--accent)" : "color-mix(in srgb, var(--text), transparent 60%)",
                                background: "none", cursor: "pointer", transition: "color 0.15s", fontFamily: "inherit",
                            }}>
                                {m === "login" ? "SIGN IN" : "REGISTER"}
                            </button>
                        ))}
                    </div>

                    <div style={{ padding: "24px" }}>
                        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {mode === "register" && (
                                <div>
                                    <label style={LABEL_STYLE}>DISPLAY NAME</label>
                                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                                        placeholder="Your name" style={INPUT_STYLE}
                                        onFocus={e => e.target.style.borderColor = "var(--primary)"}
                                        onBlur={e => e.target.style.borderColor = "color-mix(in srgb, var(--text), transparent 90%)"} />
                                </div>
                            )}
                            <div>
                                <label style={LABEL_STYLE}>EMAIL</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                    placeholder="you@example.com" required style={INPUT_STYLE}
                                    onFocus={e => e.target.style.borderColor = "var(--primary)"}
                                    onBlur={e => e.target.style.borderColor = "color-mix(in srgb, var(--text), transparent 90%)"} />
                            </div>
                            <div>
                                <label style={LABEL_STYLE}>PASSWORD</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••" required minLength={6} style={INPUT_STYLE}
                                    onFocus={e => e.target.style.borderColor = "var(--primary)"}
                                    onBlur={e => e.target.style.borderColor = "color-mix(in srgb, var(--text), transparent 90%)"} />
                            </div>

                            {error && (
                                <p style={{ fontSize: "13px", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent), transparent 80%)", background: "color-mix(in srgb, var(--accent), transparent 95%)", borderRadius: "4px", padding: "10px 12px" }}>
                                    {error}
                                </p>
                            )}

                            <button type="submit" disabled={loading} style={{
                                width: "100%", background: loading ? "var(--primary)" : "var(--accent)",
                                border: "none", borderRadius: "4px", padding: "12px",
                                fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em",
                                color: "var(--background)", cursor: loading ? "not-allowed" : "pointer",
                                fontFamily: "inherit", transition: "all 0.15s",
                            }}
                                onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.background = "var(--primary)"; }}
                                onMouseLeave={e => { if (!loading) (e.target as HTMLButtonElement).style.background = "var(--accent)"; }}
                            >
                                {loading ? "CONNECTING..." : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
                            </button>
                        </form>

                        <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
                            <div style={{ flex: 1, borderTop: "1px solid color-mix(in srgb, var(--text), transparent 90%)" }} />
                            <span style={{ fontSize: "12px", color: "color-mix(in srgb, var(--text), transparent 70%)" }}>or</span>
                            <div style={{ flex: 1, borderTop: "1px solid color-mix(in srgb, var(--text), transparent 90%)" }} />
                        </div>

                        <button onClick={handleDemo} disabled={loading} style={{
                            width: "100%", background: "none",
                            border: "1px solid color-mix(in srgb, var(--text), transparent 90%)", borderRadius: "4px", padding: "12px",
                            fontSize: "13px", letterSpacing: "0.15em", fontWeight: 600,
                            color: "color-mix(in srgb, var(--text), transparent 50%)", cursor: loading ? "not-allowed" : "pointer",
                            fontFamily: "inherit", transition: "all 0.15s",
                        }}
                            onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = "var(--accent)"; b.style.color = "var(--accent)"; }}
                            onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = "color-mix(in srgb, var(--text), transparent 90%)"; b.style.color = "color-mix(in srgb, var(--text), transparent 50%)"; }}
                        >
                            {loading ? "CONNECTING..." : "⚡  TRY DEMO ACCOUNT"}
                        </button>
                        <p style={{ fontSize: "12px", color: "color-mix(in srgb, var(--text), transparent 70%)", textAlign: "center", marginTop: "8px" }}>
                            Pre-loaded with sample meetings &amp; tasks
                        </p>
                    </div>
                </div>

                <p style={{ fontSize: "11px", color: "color-mix(in srgb, var(--text), transparent 80%)", textAlign: "center", marginTop: "24px", letterSpacing: "0.2em" }}>
                    COMMUNITAI · SECURE SESSION
                </p>
            </div>
        </div>
    );
}
