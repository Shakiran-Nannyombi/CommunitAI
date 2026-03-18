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
            router.push("/");
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
            router.push("/");
        } catch {
            setError("Could not load demo account");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center font-mono p-4">
            {/* Scanline overlay */}
            <div className="fixed inset-0 pointer-events-none scanline opacity-30" />

            <div className="w-full max-w-sm">
                {/* Header */}
                <div className="mb-8 text-center">
                    <p className="text-green-400 text-xl font-bold tracking-[0.3em] uppercase">
                        CommunitAI
                    </p>
                    <p className="text-zinc-600 text-xs mt-1 tracking-widest uppercase">
                        AI Chief of Staff
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-zinc-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 pulse-dot" />
                        SYSTEM ONLINE
                    </div>
                </div>

                {/* Panel */}
                <div className="panel rounded">
                    {/* Tab bar */}
                    <div className="panel-header">
                        <div className="flex gap-0">
                            {(["login", "register"] as Mode[]).map(m => (
                                <button
                                    key={m}
                                    onClick={() => { setMode(m); setError(""); }}
                                    className={`px-4 py-1.5 text-xs uppercase tracking-widest border-b-2 transition ${mode === m
                                            ? "border-green-500 text-green-400"
                                            : "border-transparent text-zinc-600 hover:text-zinc-400"
                                        }`}
                                >
                                    {m === "login" ? "Sign In" : "Register"}
                                </button>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-5 space-y-3">
                        {mode === "register" && (
                            <div>
                                <label className="block text-zinc-600 text-xs uppercase tracking-widest mb-1">
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Your name"
                                    className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-green-700 transition"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-zinc-600 text-xs uppercase tracking-widest mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-green-700 transition"
                            />
                        </div>

                        <div>
                            <label className="block text-zinc-600 text-xs uppercase tracking-widest mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-green-700 transition"
                            />
                        </div>

                        {error && (
                            <p className="text-red-400 text-xs border border-red-900 bg-red-950/30 rounded px-3 py-2">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-widest py-2.5 rounded transition"
                        >
                            {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="px-5 pb-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex-1 border-t border-zinc-900" />
                            <span className="text-zinc-700 text-xs">or</span>
                            <div className="flex-1 border-t border-zinc-900" />
                        </div>

                        <button
                            onClick={handleDemo}
                            disabled={loading}
                            className="w-full border border-zinc-800 hover:border-green-800 disabled:opacity-50 text-zinc-400 hover:text-green-400 text-xs uppercase tracking-widest py-2.5 rounded transition"
                        >
                            {loading ? "..." : "⚡ Try Demo Account"}
                        </button>
                        <p className="text-zinc-700 text-xs text-center mt-2">
                            Pre-loaded with sample meetings &amp; tasks
                        </p>
                    </div>
                </div>

                <p className="text-zinc-800 text-xs text-center mt-6 tracking-widest">
                    COMMUNITAI · SECURE SESSION
                </p>
            </div>
        </div>
    );
}
