import Link from "next/link";

const FEATURES = [
    {
        icon: "🎙",
        title: "Record Any Meeting",
        body: "Upload audio from your HOA, campus club, or community call. CommunitAI handles the rest.",
    },
    {
        icon: "⚡",
        title: "Instant AI Summary",
        body: "Powered by DigitalOcean Gradient AI. Get a clean summary seconds after your meeting ends.",
    },
    {
        icon: "✅",
        title: "Auto Action Items",
        body: "Every task, owner, and deadline is extracted automatically — no manual note-taking.",
    },
    {
        icon: "💬",
        title: "Generate Follow-ups",
        body: "One click drafts a personalised Slack or Discord nudge for each person on the task list.",
    },
    {
        icon: "🏘️",
        title: "Multi-Community Workspaces",
        body: "Switch between your HOA, campus group, and sports club without losing context.",
    },
    {
        icon: "📊",
        title: "Community Health Score",
        body: "Sentiment analysis on every meeting so you know when morale needs attention.",
    },
];

const STEPS = [
    { n: "01", title: "Upload your recording", body: "Drop in any MP3, WAV, or M4A from your meeting." },
    { n: "02", title: "AI processes it", body: "Gradient AI transcribes, summarises, and extracts every action item." },
    { n: "03", title: "Review & act", body: "Open your Command Centre, check tasks, and send follow-ups in one click." },
];

export default function LandingPage() {
    return (
        <div style={{ minHeight: "100dvh", background: "#fff" }}>

            {/* ── Nav ── */}
            <nav style={{
                position: "sticky", top: 0, zIndex: 50,
                borderBottom: "1px solid #e5e7eb",
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(8px)",
                padding: "0 24px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                height: "60px",
            }}>
                <span style={{ fontWeight: 800, fontSize: "18px", letterSpacing: "0.05em", color: "#111" }}>
                    Communit<span style={{ color: "#16a34a" }}>AI</span>
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                    <Link href="/about" style={{ fontSize: "14px", color: "#6b7280", textDecoration: "none", fontWeight: 500 }}>About</Link>
                    <Link href="/login" style={{ fontSize: "14px", color: "#6b7280", textDecoration: "none", fontWeight: 500 }}>Sign In</Link>
                    <Link href="/login" style={{
                        fontSize: "14px", fontWeight: 600, color: "#fff",
                        background: "#16a34a", borderRadius: "6px",
                        padding: "8px 18px", textDecoration: "none",
                    }}>Get Started</Link>
                </div>
            </nav>

            {/* ── Hero ── */}
            <section style={{
                maxWidth: "900px", margin: "0 auto",
                padding: "96px 24px 80px",
                textAlign: "center",
            }}>
                <div style={{
                    display: "inline-flex", alignItems: "center", gap: "8px",
                    background: "#f0fdf4", border: "1px solid #bbf7d0",
                    borderRadius: "999px", padding: "6px 14px",
                    fontSize: "12px", fontWeight: 600, color: "#16a34a",
                    marginBottom: "28px", letterSpacing: "0.05em",
                }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                    POWERED BY DIGITALOCEAN GRADIENT AI
                </div>

                <h1 style={{
                    fontSize: "clamp(36px, 6vw, 64px)",
                    fontWeight: 800, lineHeight: 1.1,
                    color: "#111", marginBottom: "24px",
                    letterSpacing: "-0.02em",
                }}>
                    Your AI Chief of Staff<br />
                    <span style={{ color: "#16a34a" }}>for every community you lead</span>
                </h1>

                <p style={{
                    fontSize: "18px", color: "#6b7280", lineHeight: 1.7,
                    maxWidth: "600px", margin: "0 auto 40px",
                }}>
                    Record your meetings. Get instant summaries, action items, and AI-generated follow-ups — across all your communities in one place.
                </p>

                <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                    <Link href="/login" style={{
                        fontSize: "15px", fontWeight: 700, color: "#fff",
                        background: "#16a34a", borderRadius: "8px",
                        padding: "14px 32px", textDecoration: "none",
                        boxShadow: "0 4px 14px rgba(22,163,74,0.3)",
                    }}>
                        Try for free →
                    </Link>
                    <Link href="/about" style={{
                        fontSize: "15px", fontWeight: 600, color: "#374151",
                        background: "#f9fafb", border: "1px solid #e5e7eb",
                        borderRadius: "8px", padding: "14px 32px", textDecoration: "none",
                    }}>
                        Learn more
                    </Link>
                </div>
            </section>

            {/* ── Terminal preview strip ── */}
            <section style={{ background: "#0a0a0a", padding: "48px 24px" }}>
                <div style={{
                    maxWidth: "800px", margin: "0 auto",
                    border: "1px solid #1f1f1f", borderRadius: "10px",
                    overflow: "hidden", fontFamily: "monospace",
                }}>
                    <div style={{ background: "#111", padding: "10px 16px", display: "flex", gap: "6px", alignItems: "center" }}>
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444" }} />
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b" }} />
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#22c55e" }} />
                        <span style={{ marginLeft: "12px", fontSize: "11px", color: "#52525b" }}>CommunitAI — Command Centre</span>
                    </div>
                    <div style={{ background: "#030303", padding: "24px", fontSize: "12px", color: "#4ade80", lineHeight: 2 }}>
                        <p><span style={{ color: "#52525b" }}>●</span> DB CONNECTED &nbsp;&nbsp; WORKSPACES: <span style={{ color: "#a1a1aa" }}>3</span> &nbsp;&nbsp; OPEN TASKS: <span style={{ color: "#facc15" }}>7</span> &nbsp;&nbsp; MEETINGS: <span style={{ color: "#a1a1aa" }}>12</span></p>
                        <p style={{ color: "#a1a1aa", marginTop: "8px" }}>▸ HOA Monthly Meeting — <span style={{ color: "#4ade80" }}>DONE</span> — 4 action items extracted</p>
                        <p style={{ color: "#a1a1aa" }}>▸ Campus Tech Club — <span style={{ color: "#60a5fa" }}>PROC</span> — transcribing...</p>
                        <p style={{ color: "#a1a1aa" }}>▸ Sports Committee — <span style={{ color: "#4ade80" }}>DONE</span> — summary ready</p>
                        <p style={{ marginTop: "12px" }}>⚡ Gradient AI nudge generated for @john → <span style={{ color: "#d4d4d8" }}>&quot;Hey @john, just a reminder to book the venue by Friday!&quot;</span></p>
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "80px 24px" }}>
                <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#111", textAlign: "center", marginBottom: "12px" }}>
                    Everything a community leader needs
                </h2>
                <p style={{ textAlign: "center", color: "#6b7280", fontSize: "16px", marginBottom: "56px" }}>
                    Stop losing track of decisions and follow-ups across your groups.
                </p>
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "24px",
                }}>
                    {FEATURES.map(f => (
                        <div key={f.title} style={{
                            border: "1px solid #e5e7eb", borderRadius: "10px",
                            padding: "28px 24px", background: "#fafafa",
                        }}>
                            <div style={{ fontSize: "28px", marginBottom: "12px" }}>{f.icon}</div>
                            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#111", marginBottom: "8px" }}>{f.title}</h3>
                            <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.6 }}>{f.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── How it works ── */}
            <section style={{ background: "#f9fafb", padding: "80px 24px" }}>
                <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                    <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#111", textAlign: "center", marginBottom: "56px" }}>
                        How it works
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                        {STEPS.map((s, i) => (
                            <div key={s.n} style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
                                <div style={{
                                    flexShrink: 0, width: "48px", height: "48px",
                                    borderRadius: "50%", background: "#f0fdf4",
                                    border: "2px solid #bbf7d0",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "13px", fontWeight: 800, color: "#16a34a",
                                    fontFamily: "monospace",
                                }}>{s.n}</div>
                                <div>
                                    <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#111", marginBottom: "6px" }}>{s.title}</h3>
                                    <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.6 }}>{s.body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section style={{ padding: "80px 24px", textAlign: "center" }}>
                <h2 style={{ fontSize: "36px", fontWeight: 800, color: "#111", marginBottom: "16px" }}>
                    Ready to run your communities smarter?
                </h2>
                <p style={{ fontSize: "16px", color: "#6b7280", marginBottom: "36px" }}>
                    Free to try. No credit card required.
                </p>
                <Link href="/login" style={{
                    fontSize: "16px", fontWeight: 700, color: "#fff",
                    background: "#16a34a", borderRadius: "8px",
                    padding: "16px 40px", textDecoration: "none",
                    boxShadow: "0 4px 14px rgba(22,163,74,0.3)",
                }}>
                    Get started free →
                </Link>
            </section>

            {/* ── Footer ── */}
            <footer style={{
                borderTop: "1px solid #e5e7eb", padding: "24px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                flexWrap: "wrap", gap: "12px",
                fontSize: "13px", color: "#9ca3af",
                maxWidth: "1000px", margin: "0 auto",
            }}>
                <span>© 2026 CommunitAI · Built for DigitalOcean Hackathon</span>
                <div style={{ display: "flex", gap: "20px" }}>
                    <Link href="/about" style={{ color: "#9ca3af", textDecoration: "none" }}>About</Link>
                    <Link href="/login" style={{ color: "#9ca3af", textDecoration: "none" }}>Sign In</Link>
                </div>
            </footer>
        </div>
    );
}
