import Link from "next/link";
import { LogoFull } from "@/components/Logo";

const STACK = [
    { label: "AI Inference", value: "DigitalOcean Gradient AI (llama3.3-70b-instruct)" },
    { label: "Transcription", value: "Groq Whisper" },
    { label: "Backend", value: "FastAPI + PostgreSQL (Neon)" },
    { label: "Storage", value: "Cloudflare R2" },
    { label: "Frontend", value: "Next.js 15 + Tailwind v4" },
    { label: "Auth", value: "JWT + bcrypt" },
];

const NAV_LINK: React.CSSProperties = { fontSize: "14px", color: "color-mix(in srgb, var(--text), transparent 40%)", textDecoration: "none", fontWeight: 500 };

export default function AboutPage() {
    return (
        <div style={{ minHeight: "100dvh", background: "var(--background)" }}>

            {/* Nav */}
            <nav style={{
                position: "sticky", top: 0, zIndex: 50,
                borderBottom: "1px solid color-mix(in srgb, var(--text), transparent 90%)",
                background: "color-mix(in srgb, var(--background), transparent 5%)",
                backdropFilter: "blur(8px)",
                padding: "0 24px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                height: "64px",
            }}>
                <Link href="/home" style={{ textDecoration: "none" }}>
                    <LogoFull size={28} variant="light" />
                </Link>
                <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                    <Link href="/home" style={NAV_LINK}>Home</Link>
                    <Link href="/login" style={NAV_LINK}>Sign In</Link>
                    <Link href="/login" style={{
                        fontSize: "14px", fontWeight: 600, color: "var(--background)",
                        background: "var(--accent)", borderRadius: "6px",
                        padding: "8px 18px", textDecoration: "none",
                    }}>Get Started</Link>
                </div>
            </nav>

            {/* Hero */}
            <section style={{ maxWidth: "720px", margin: "0 auto", padding: "80px 24px 60px", textAlign: "center" }}>
                <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, color: "var(--text)", marginBottom: "20px", letterSpacing: "-0.02em" }}>
                    About CommunitAI
                </h1>
                <p style={{ fontSize: "18px", color: "color-mix(in srgb, var(--text), transparent 40%)", lineHeight: 1.7 }}>
                    We built CommunitAI because community leaders — HOA chairs, campus club presidents, sports coordinators — spend more time chasing notes than actually leading.
                </p>
            </section>

            {/* The problem */}
            <section style={{ background: "color-mix(in srgb, var(--text), transparent 97%)", padding: "60px 24px" }}>
                <div style={{ maxWidth: "720px", margin: "0 auto" }}>
                    <h2 style={{ fontSize: "26px", fontWeight: 800, color: "var(--text)", marginBottom: "20px" }}>The problem we&apos;re solving</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {[
                            "You lead 3 communities. Each has monthly meetings. That's 36 sets of notes a year.",
                            "Action items get buried in chat threads. Nobody remembers who said they'd book the venue.",
                            "You want to send a follow-up but writing individual messages for 12 people takes an hour.",
                            "By the time you've caught up on one group, another meeting has already happened.",
                        ].map((p, i) => (
                            <div key={i} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                                <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: "16px", flexShrink: 0 }}>→</span>
                                <p style={{ fontSize: "15px", color: "var(--text)", lineHeight: 1.6 }}>{p}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Our solution */}
            <section style={{ maxWidth: "720px", margin: "0 auto", padding: "60px 24px" }}>
                <h2 style={{ fontSize: "26px", fontWeight: 800, color: "var(--text)", marginBottom: "20px" }}>Our solution</h2>
                <p style={{ fontSize: "15px", color: "var(--text)", lineHeight: 1.8, marginBottom: "16px" }}>
                    CommunitAI is an AI-powered Chief of Staff for community leaders. You record your meeting, upload the audio, and within minutes you have a full transcript, a clean summary, extracted action items with assignees and due dates, and a community health sentiment score.
                </p>
                <p style={{ fontSize: "15px", color: "var(--text)", lineHeight: 1.8, marginBottom: "16px" }}>
                    The Command Centre gives you a Bloomberg Terminal-style dashboard across all your communities — one place to see every open task, every pending meeting, and every person who needs a nudge.
                </p>
                <p style={{ fontSize: "15px", color: "var(--text)", lineHeight: 1.8 }}>
                    The Gradient AI nudge system drafts a personalised Slack or Discord message for each action item in seconds. You copy, paste, done.
                </p>
            </section>

            {/* Tech stack */}
            <section style={{ background: "color-mix(in srgb, var(--text), transparent 97%)", padding: "60px 24px" }}>
                <div style={{ maxWidth: "720px", margin: "0 auto" }}>
                    <h2 style={{ fontSize: "26px", fontWeight: 800, color: "var(--text)", marginBottom: "32px" }}>Built with</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                        {STACK.map(s => (
                            <div key={s.label} style={{
                                border: "1px solid color-mix(in srgb, var(--text), transparent 90%)", borderRadius: "8px",
                                padding: "16px 20px", background: "var(--background)",
                                display: "flex", flexDirection: "column", gap: "4px",
                            }}>
                                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{s.label}</span>
                                <span style={{ fontSize: "14px", color: "var(--text)", fontWeight: 500 }}>{s.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Hackathon note */}
            <section style={{ maxWidth: "720px", margin: "0 auto", padding: "60px 24px" }}>
                <div style={{ border: "1px solid color-mix(in srgb, var(--accent), transparent 80%)", borderRadius: "10px", background: "color-mix(in srgb, var(--accent), transparent 90%)", padding: "32px" }}>
                    <div style={{ fontSize: "24px", marginBottom: "12px" }}>🏆</div>
                    <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)", marginBottom: "10px" }}>DigitalOcean Hackathon 2026</h3>
                    <p style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.7 }}>
                        CommunitAI was built for the DigitalOcean Hackathon. It showcases the full Gradient AI platform — from LLM inference for summarisation and nudge generation, to the broader DigitalOcean ecosystem including managed databases and object storage.
                    </p>
                </div>
            </section>

            {/* CTA */}
            <section style={{ padding: "60px 24px 80px", textAlign: "center" }}>
                <h2 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text)", marginBottom: "16px" }}>Try it yourself</h2>
                <p style={{ fontSize: "15px", color: "color-mix(in srgb, var(--text), transparent 40%)", marginBottom: "28px" }}>
                    Use the demo account to explore with pre-loaded meetings and tasks.
                </p>
                <Link href="/login" style={{
                    fontSize: "15px", fontWeight: 700, color: "var(--background)",
                    background: "var(--accent)", borderRadius: "8px",
                    padding: "14px 36px", textDecoration: "none",
                    boxShadow: "0 4px 14px color-mix(in srgb, var(--accent), transparent 75%)",
                    display: "inline-block",
                }}>
                    Open the demo →
                </Link>
            </section>

            {/* Footer */}
            <footer style={{
                borderTop: "1px solid color-mix(in srgb, var(--text), transparent 90%)", padding: "24px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                flexWrap: "wrap", gap: "12px", fontSize: "13px", color: "color-mix(in srgb, var(--text), transparent 60%)",
                maxWidth: "1000px", margin: "0 auto",
            }}>
                <span>© 2026 CommunitAI · Built for DigitalOcean Hackathon</span>
                <div style={{ display: "flex", gap: "20px" }}>
                    <Link href="/home" style={{ color: "color-mix(in srgb, var(--text), transparent 60%)", textDecoration: "none" }}>Home</Link>
                    <Link href="/login" style={{ color: "color-mix(in srgb, var(--text), transparent 60%)", textDecoration: "none" }}>Sign In</Link>
                </div>
            </footer>
        </div>
    );
}
