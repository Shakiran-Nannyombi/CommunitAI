"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register, demoLogin, saveAuth } from "@/lib/api";
import { LogoMark } from "@/components/Logo";
import { Mail, Lock, CheckCircle2, ArrowRight, Rocket } from "lucide-react";
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
        <div className="font-sans bg-background text-text min-h-dvh flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-accent opacity-[0.03] blur-[120px] rounded-full"></div>
                <div className="absolute top-1/2 -right-24 w-80 h-80 bg-primary opacity-[0.03] blur-[100px] rounded-full"></div>
            </div>

            <div className="relative z-10 w-full max-w-[1100px] min-h-[650px] flex flex-col lg:flex-row bg-background border border-text/10 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden">
                {/* Visual Side */}
                <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 bg-text/2 border-r border-text/5 relative group">
                    <div className="relative z-10">
                        <Link href="/" className="flex items-center gap-3 mb-16">
                            <LogoMark size={40} className="hover:scale-110 transition-transform" />
                            <span className="text-2xl font-black tracking-tighter text-text">CommunitAI</span>
                        </Link>
                        
                        <div className="space-y-8">
                            <h2 className="text-6xl font-extrabold leading-[1.1] tracking-tighter text-text">
                                Focus on <br/>
                                <span className="text-accent underline decoration-accent/20 underline-offset-8">Leading</span> <br/>
                                Not Managing.
                            </h2>
                            <p className="text-xl text-text/50 max-w-sm font-medium leading-relaxed">
                                The AI-powered Chief of Staff that turned chaos into community growth overnight.
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10">
                        <div className="flex -space-x-3 mb-6">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-10 w-10 rounded-full border-2 border-background bg-text/10 overflow-hidden ring-2 ring-accent/5">
                                    <div className="h-full w-full bg-accent/20" />
                                </div>
                            ))}
                            <div className="h-10 w-10 rounded-full border-2 border-background bg-accent text-background flex items-center justify-center text-[10px] font-bold ring-2 ring-accent/5 whitespace-nowrap px-2">
                                +12k
                            </div>
                        </div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-text/30">Trusted by modern leaders</p>
                    </div>

                    {/* Decorative Blob */}
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-accent/5 blur-[80px] rounded-full translate-x-1/2 translate-y-1/2 group-hover:scale-125 transition-transform duration-700"></div>
                </div>

                {/* Form Side */}
                <div className="flex-1 flex flex-col p-8 lg:p-16 justify-center">
                    <div className="max-w-[400px] w-full mx-auto">
                        <div className="mb-10 text-center lg:text-left">
                            <h3 className="text-3xl font-black tracking-tight text-text mb-3">
                                {mode === "login" ? "Welcome back" : "Join the movement"}
                            </h3>
                            <p className="text-text/50 font-medium">
                                {mode === "login" 
                                    ? "Access your dashboard to continue leading." 
                                    : "Start your 14-day free trial today. No credit card."}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {mode === "register" && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-text/40 ml-1">Full Name</label>
                                    <div className="relative">
                                        <CheckCircle2 className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-text/20" />
                                        <input 
                                            value={name} onChange={e => setName(e.target.value)}
                                            placeholder="Enter your name" required
                                            className="w-full bg-text/5 border border-text/10 rounded-2xl pl-12 pr-5 py-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all placeholder:text-text/20"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-text/40 ml-1">Work Email</label>
                                <div className="group relative">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-text/20 group-focus-within:text-accent transition-colors" />
                                    <input 
                                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                                        placeholder="name@community.io" required
                                        className="w-full bg-text/5 border border-text/10 rounded-2xl pl-12 pr-5 py-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all placeholder:text-text/20"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-end mb-1">
                                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-text/40 ml-1">Password</label>
                                    {mode === "login" && (
                                        <button type="button" className="text-[10px] font-bold text-accent uppercase hover:underline">Forgot?</button>
                                    )}
                                </div>
                                <div className="group relative">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-text/20 group-focus-within:text-accent transition-colors" />
                                    <input 
                                        type="password" value={password} onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••" required minLength={6}
                                        className="w-full bg-text/5 border border-text/10 rounded-2xl pl-12 pr-5 py-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all placeholder:text-text/20"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-500 text-xs font-bold">
                                    {error}
                                </div>
                            )}

                            <button 
                                type="submit" disabled={loading}
                                className="w-full bg-accent hover:bg-accent/90 text-background font-black py-4 rounded-2xl shadow-[0_20px_40px_-12px_rgba(66,174,68,0.3)] hover:shadow-accent/40 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 group"
                            >
                                {loading ? "Authenticating..." : (mode === "login" ? "Sign In" : "Register")}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </form>

                        <div className="mt-10 pt-10 border-t border-text/5 text-center">
                            <p className="text-sm font-medium text-text/40 mb-4">
                                {mode === "login" ? "New to CommunitAI?" : "Already have an account?"}
                            </p>
                            <button 
                                onClick={() => setMode(mode === "login" ? "register" : "login")}
                                className="text-sm font-black text-text hover:text-accent transition-colors underline decoration-text/10 underline-offset-4"
                            >
                                {mode === "login" ? "Create an account" : "Sign in to your account"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Demo Button */}
            {!loading && (
                <button 
                    onClick={handleDemo}
                    className="fixed bottom-6 right-6 bg-text/5 hover:bg-text/10 border border-text/10 px-4 py-2 rounded-xl text-xs font-bold text-text/40 hover:text-accent transition-all flex items-center gap-2 group z-20"
                >
                    <Rocket className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    Try Demo
                </button>
            )}
        </div>
    );
}
