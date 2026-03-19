"use client";

import Link from "next/link";
import { LogoFull, LogoMark } from "@/components/Logo";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
    Moon, Sun, Mic, Zap, CheckSquare, MessageSquare,
    LayoutDashboard, BarChart3, ArrowRight, Play,
    Users, Clock, TrendingUp, Shield
} from "lucide-react";
import { BackgroundBeams } from "@/components/BackgroundBeams";

/* ─── Data ──────────────────────────────────────────────────────────────── */
const FEATURES = [
    { icon: Mic, title: "Record Any Meeting", body: "Upload MP3, WAV, or M4A — or record live in the browser.", color: "#3b82f6", glow: "rgba(59,130,246,0.15)" },
    { icon: Zap, title: "Instant AI Summary", body: "Powered by DigitalOcean Gradient AI. Clean summary in seconds.", color: "#42ae44", glow: "rgba(66,174,68,0.15)" },
    { icon: CheckSquare, title: "Auto Action Items", body: "Every task, owner, and deadline extracted — zero manual effort.", color: "#f59e0b", glow: "rgba(245,158,11,0.15)" },
    { icon: MessageSquare, title: "AI Follow-ups", body: "One click drafts a personalised nudge for every task owner.", color: "#a855f7", glow: "rgba(168,85,247,0.15)" },
    { icon: LayoutDashboard, title: "Multi-Community", body: "Switch between HOA, campus group, and sports club seamlessly.", color: "#42ae44", glow: "rgba(66,174,68,0.15)" },
    { icon: BarChart3, title: "Health Score", body: "Sentiment analysis on every meeting — know when morale dips.", color: "#ef4444", glow: "rgba(239,68,68,0.15)" },
];

const STATS = [
    { value: "< 30s", label: "First summary", icon: Clock },
    { value: "100%", label: "Auto extraction", icon: TrendingUp },
    { value: "∞", label: "Communities", icon: Users },
    { value: "0", label: "Manual notes", icon: Shield },
];

const STEPS = [
    { n: "01", title: "Upload your recording", body: "Drop in any audio file or record directly in the browser." },
    { n: "02", title: "Gradient AI processes it", body: "Transcription, summarisation, and action item extraction — all automatic." },
    { n: "03", title: "Review & act", body: "Open your Command Centre, check tasks, send AI-drafted follow-ups." },
];

/* ─── Animation variants ─────────────────────────────────────────────────── */
const fadeUp = {
    hidden: { opacity: 0, y: 32 },
    show: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] as any }
    }),
};

/* ─── Mock terminal lines ────────────────────────────────────────────────── */
const TERMINAL_LINES = [
    { delay: 0.6, color: "#42ae44", text: "● CONNECTED  ·  WORKSPACES: 3  ·  OPEN TASKS: 7" },
    { delay: 0.9, color: "#94a3b8", text: "▸ HOA Monthly Meeting — DONE — 4 action items" },
    { delay: 1.1, color: "#94a3b8", text: "▸ Campus Tech Club — PROCESSING — transcribing..." },
    { delay: 1.3, color: "#94a3b8", text: "▸ Sports Committee — DONE — summary ready" },
    { delay: 1.6, color: "#42ae44", text: '⚡ Nudge → "Hey @john, book the venue by Friday!"' },
];

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function LandingPage() {
    const [dark, setDark] = useState(true);
    const heroRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
    const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);

    useEffect(() => {
        const saved = localStorage.getItem("theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const isDark = saved ? saved === "dark" : prefersDark;
        setDark(isDark);
        document.documentElement.classList.toggle("dark", isDark);
    }, []);

    function toggleTheme() {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem("theme", next ? "dark" : "light");
    }

    return (
        <div className="min-h-dvh bg-background text-text antialiased">

            {/* Ambient glow */}
            <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
                <div style={{ position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)", width: "900px", height: "600px", background: "radial-gradient(ellipse at center, rgba(66,174,68,0.12) 0%, transparent 70%)", filter: "blur(40px)" }} />
                <div style={{ position: "absolute", bottom: "10%", right: "-10%", width: "500px", height: "500px", background: "radial-gradient(ellipse at center, rgba(59,130,246,0.08) 0%, transparent 70%)", filter: "blur(60px)" }} />
            </div>

            {/* Nav */}
            <nav className="sticky top-0 z-50 border-b border-text/8 backdrop-blur-xl" style={{ background: "color-mix(in srgb, var(--color-background) 85%, transparent)" }}>
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <LogoFull size={26} variant="light" />
                    <div className="flex items-center gap-5">
                        <Link href="/about" className="text-sm font-medium text-text/50 hover:text-text transition-colors hidden sm:block">About</Link>
                        <Link href="/login" className="text-sm font-medium text-text/50 hover:text-text transition-colors hidden sm:block">Sign In</Link>
                        <button onClick={toggleTheme} aria-label="Toggle theme"
                            className="w-9 h-9 rounded-xl border border-text/10 bg-text/5 hover:bg-text/10 flex items-center justify-center text-text/50 hover:text-text transition-all">
                            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                        <Link href="/login" className="text-sm font-bold text-background bg-accent hover:bg-accent/90 rounded-xl px-5 py-2.5 transition-all shadow-lg shadow-accent/20">
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section ref={heroRef} className="relative overflow-hidden max-w-5xl mx-auto px-6 pt-28 pb-16 text-center">
                <BackgroundBeams className="opacity-60" />
                <motion.div style={{ y: heroY }} className="relative z-10">
                    <motion.h1
                        initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] as any }}
                        className="text-5xl md:text-[72px] font-extrabold tracking-tight leading-[1.06] text-text mb-6"
                    >
                        Your AI Chief of Staff<br />
                        <span style={{ color: "var(--color-accent)" }}>for every community</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.55 }}
                        className="text-lg text-text/55 leading-relaxed max-w-xl mx-auto mb-10"
                    >
                        Record your meetings. Get instant summaries, action items, and AI-generated follow-ups — across all your communities in one place.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="flex gap-3 justify-center flex-wrap mb-6"
                    >
                        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-background bg-accent hover:bg-accent/90 rounded-xl px-8 py-4 transition-all shadow-xl shadow-accent/25">
                            Try for free <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link href="/login?demo=1" className="inline-flex items-center gap-2 text-sm font-semibold text-text rounded-xl px-8 py-4 transition-all"
                            style={{ border: "1px solid rgba(var(--text-rgb, 22,29,23), 0.14)" }}>
                            <Play className="w-4 h-4" /> View demo
                        </Link>
                    </motion.div>
                </motion.div>
            </section>

            {/* App mockup */}
            <section className="px-6 pb-28">
                <motion.div
                    initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, duration: 0.8, ease: [0.16, 1, 0.3, 1] as any }}
                    className="max-w-4xl mx-auto"
                >
                    <div className="rounded-[2.5rem] p-1.5 bg-linear-to-br from-accent/40 via-accent/5 to-blue-500/20 shadow-2xl">
                        <div className="rounded-[2.2rem] overflow-hidden bg-background">
                            <div className="bg-text/5 border-b border-text/8 px-6 py-4 flex items-center gap-2.5">
                                <span className="w-3 h-3 rounded-full bg-red-500/60" />
                                <span className="w-3 h-3 rounded-full bg-amber-500/60" />
                                <span className="w-3 h-3 rounded-full bg-accent/60" />
                                <span className="ml-4 font-mono text-xs opacity-40">CommunitAI — Command Centre</span>
                            </div>
                            <div className="p-8 lg:p-12 font-mono text-sm leading-relaxed">
                                {TERMINAL_LINES.map((line, i) => (
                                    <motion.p key={i}
                                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: line.delay }}
                                        style={{ color: line.color }} className="mb-2">
                                        {line.text}
                                    </motion.p>
                                ))}
                                <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }}
                                    className="w-2 h-4 bg-accent mt-2" />
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Stats */}
            <section className="border-y border-text/8 bg-text/2 py-20 px-6">
                <div className="max-w-4xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
                    {STATS.map((s, i) => (
                        <motion.div key={s.label} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                            <s.icon className="w-5 h-5 mx-auto mb-3 text-accent opacity-60" />
                            <p className="text-4xl font-black tracking-tight text-accent">{s.value}</p>
                            <p className="text-[10px] font-black text-text/40 uppercase tracking-widest mt-2">{s.label}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section className="max-w-6xl mx-auto px-6 py-32">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {FEATURES.map((f, i) => (
                        <motion.div key={f.title} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                            className="p-8 rounded-[2.5rem] bg-text/2 border border-text/8 hover:border-accent/40 transition-all duration-500 group">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500"
                                style={{ background: f.glow, border: `1px solid ${f.color}20` }}>
                                <f.icon className="w-6 h-6" style={{ color: f.color }} />
                            </div>
                            <h3 className="text-base font-black text-text mb-3 tracking-tight">{f.title}</h3>
                            <p className="text-sm text-text/45 leading-relaxed font-medium">{f.body}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-text/8 py-16 px-6">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="flex items-center gap-4">
                        <LogoMark size={32} />
                        <div>
                            <p className="text-lg font-black tracking-tight text-text">CommunitAI</p>
                            <p className="text-xs font-bold text-text/30">AI Chief of Staff</p>
                        </div>
                    </div>
                    <div className="text-[10px] font-black text-text/20 uppercase tracking-[0.3em]">
                        © 2026 CommunitAI · Built for DigitalOcean Hackathon
                    </div>
                </div>
            </footer>
        </div>
    );
}
