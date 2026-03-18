"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login, register, demoLogin, saveAuth } from "@/lib/api";
import { LogoMark } from "@/components/Logo";
import {
    Mail, Lock, ArrowRight, CheckCircle2,
    Rocket, Sun, Moon, Home as HomeIcon
} from "lucide-react";
import Link from "next/link";

type Mode = "login" | "register";

export default function AuthPage() {
    const router = useRouter();
    const [mode, setMode] = useState<Mode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [theme, setTheme] = useState<"light" | "dark">("light");

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") as "light" | "dark";
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.classList.toggle("dark", savedTheme === "dark");
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme("dark");
            document.documentElement.classList.add("dark");
        }

        // Auto-trigger demo login if ?demo=1
        const params = new URLSearchParams(window.location.search);
        if (params.get("demo") === "1") {
            handleDemo();
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.classList.toggle("dark", newTheme === "dark");
    };

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
        <div className="font-sans bg-background text-text h-screen w-full flex flex-col relative overflow-hidden antialiased">
            {/* Top Navigation */}
            <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-6 lg:p-10 pointer-events-none">
                <div className="flex items-center gap-4 pointer-events-auto">
                    <Link href="/" className="p-2.5 bg-text/5 hover:bg-text/10 border border-text/5 rounded-xl transition-all group">
                        <HomeIcon className="w-4 h-4 text-text/40 group-hover:text-text transition-colors" />
                    </Link>
                    <button
                        onClick={() => setMode(mode === "login" ? "register" : "login")}
                        className="text-[9px] font-black uppercase tracking-[0.2em] text-text/30 hover:text-text transition-colors"
                    >
                        {mode === "login" ? "Create Account" : "Sign In"}
                    </button>
                </div>
                <button
                    onClick={toggleTheme}
                    className="p-2.5 bg-text/5 hover:bg-text/10 border border-text/5 rounded-xl transition-all group pointer-events-auto"
                >
                    {theme === "light" ? (
                        <Moon className="w-4 h-4 text-text/40 group-hover:text-accent transition-colors" />
                    ) : (
                        <Sun className="w-4 h-4 text-accent group-hover:text-text transition-colors" />
                    )}
                </button>
            </div>

            <div className="relative z-10 w-full h-full flex flex-col lg:flex-row overflow-hidden">
                {/* Visual Side */}
                <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-20 bg-text/2 border-r border-text/5 relative group overflow-hidden">
                    <div className="relative z-10 space-y-12">
                        <Link href="/" className="flex items-center gap-4">
                            <LogoMark size={40} className="hover:rotate-12 transition-transform duration-500" />
                            <span className="text-2xl font-black tracking-tighter text-text uppercase">CommunitAI</span>
                        </Link>

                        <div className="space-y-8">
                            <h2 className="text-6xl font-black leading-[1.05] tracking-tighter text-text">
                                Focus on <br />
                                <span className="text-accent underline decoration-accent/10 underline-offset-12 decoration-12">Leading</span> <br />
                                <span className="text-text/20 italic">Not Managing.</span>
                            </h2>
                            <p className="text-xl text-text/40 max-w-sm font-medium leading-relaxed tracking-tight">
                                The AI-powered Chief of Staff that turns chaos into community growth overnight.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form Side */}
                <div className="flex-1 h-full overflow-y-auto custom-scrollbar flex flex-col p-10 lg:p-20 justify-center bg-background relative">
                    <div className="max-w-[420px] w-full mx-auto py-12">
                        <div className="text-center lg:text-left space-y-3 mb-10">
                            <div className="inline-flex px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-[8px] font-black text-accent uppercase tracking-widest">
                                {mode === "login" ? "Security Protocol" : "Join the Movement"}
                            </div>
                            <h3 className="text-4xl font-black tracking-tighter text-text">
                                {mode === "login" ? "Welcome back" : "Create Account"}
                            </h3>
                            <p className="text-base text-text/40 font-medium tracking-tight">
                                {mode === "login"
                                    ? "Access your dashboard to continue leading."
                                    : "Start your journey with CommunitAI today."}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className={`space-y-1.5 transition-all duration-500 overflow-hidden ${mode === 'register' ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text/20 ml-1">Full Identity</label>
                                <div className="relative">
                                    <CheckCircle2 className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-text/20" />
                                    <input
                                        value={name} onChange={e => setName(e.target.value)}
                                        placeholder="Enter your name" required={mode === 'register'}
                                        className="w-full bg-text/3 border border-text/5 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-accent/5 focus:border-accent/40 transition-all placeholder:text-text/10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text/20 ml-1">Work Protocol / Email</label>
                                <div className="group relative">
                                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-text/20 group-focus-within:text-accent transition-colors" />
                                    <input
                                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                                        placeholder="name@community.io" required
                                        className="w-full bg-text/3 border border-text/5 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-accent/5 focus:border-accent/40 transition-all placeholder:text-text/10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between items-end mb-0.5">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text/20 ml-1">Secure Passcode</label>
                                    {mode === "login" && (
                                        <button type="button" className="text-[9px] font-black text-accent uppercase tracking-widest hover:underline underline-offset-4">Forgot?</button>
                                    )}
                                </div>
                                <div className="group relative">
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-text/20 group-focus-within:text-accent transition-colors" />
                                    <input
                                        type="password" value={password} onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••" required minLength={6}
                                        className="w-full bg-text/3 border border-text/5 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-accent/5 focus:border-accent/40 transition-all placeholder:text-text/10"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-500 text-xs font-bold animate-shake">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit" disabled={loading}
                                className="w-full bg-accent hover:bg-accent/90 text-background font-black py-4 rounded-2xl shadow-xl shadow-accent/20 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 group uppercase tracking-widest text-[10px]"
                            >
                                {loading ? "Authorizing..." : (mode === "login" ? "Initiate Session" : "Create Access")}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                            </button>
                        </form>

                        <div className="pt-10 border-t border-text/5 text-center mt-10">
                            <button
                                onClick={() => setMode(mode === "login" ? "register" : "login")}
                                className="inline-flex items-center gap-2 text-xs font-black text-accent hover:text-accent/80 transition-all uppercase tracking-widest px-6 py-2.5 rounded-full bg-accent/5 border border-accent/10 hover:border-accent/30"
                            >
                                {mode === "login" ? "New here? Create Account" : "Wait, I have an account"}
                                <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Try Demo Button */}
            {!loading && (
                <button
                    onClick={handleDemo}
                    className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 bg-text text-background px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-accent hover:scale-105 transition-all flex items-center gap-2 shadow-xl z-50 group border border-background/20"
                >
                    <Rocket className="w-3.5 h-3.5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
                    Try Demo
                </button>
            )}
        </div>
    );
}
