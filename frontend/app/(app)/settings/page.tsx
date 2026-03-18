"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadAuth, clearAuth, type AuthUser } from "@/lib/api";
import { 
    User, Mail, Bell, Shield, Settings as SettingsIcon,
    Slack, Github, Link as LinkIcon, LogOut,
    CheckCircle2, AlertCircle, ChevronRight, Moon,
    Sparkles, Zap, ShieldCheck
} from "lucide-react";

export default function SettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const auth = loadAuth();
        if (!auth) { router.replace("/login"); return; }
        setUser(auth);
        setLoading(false);
    }, [router]);

    function handleLogout() {
        clearAuth();
        router.push("/home");
    }

    function handleSave() {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    }

    if (loading || !user) return null;

    return (
        <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto px-16 lg:px-20 py-20 relative">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="max-w-4xl mx-auto w-full space-y-24 relative z-10">
                {/* Header */}
                <div className="space-y-6">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-accent/10 border border-accent/20 rounded-3xl text-accent shadow-2xl shadow-accent/5">
                            <SettingsIcon className="w-8 h-8" />
                        </div>
                        <h1 className="text-5xl font-black text-text tracking-tighter">Settings</h1>
                    </div>
                    <p className="text-xl text-text/40 font-semibold leading-relaxed">Manage your profile, integrations, and preferences.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {/* Sidebar Nav */}
                    <div className="space-y-2">
                        {[
                            { id: "profile", label: "Profile", icon: User, active: true },
                            { id: "integrations", label: "Integrations", icon: Zap, active: false },
                            { id: "security", label: "Security", icon: Shield, active: false },
                            { id: "notifications", label: "Notifications", icon: Bell, active: false },
                        ].map(item => (
                            <button 
                                key={item.id}
                                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    item.active 
                                        ? "bg-text text-background shadow-xl shadow-text/5" 
                                        : "text-text/30 hover:text-text/60 hover:bg-text/5"
                                }`}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                                {item.active && <ChevronRight className="w-3 h-3 ml-auto" />}
                            </button>
                        ))}
                        
                        <div className="pt-8">
                            <button 
                                onClick={handleLogout}
                                className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-12">
                        {/* Profile Section */}
                        <section className="glass-card rounded-4xl p-10 space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 rounded-4xl bg-accent/10 border-4 border-background ring-2 ring-accent/20 flex items-center justify-center text-4xl font-black shadow-xl overflow-hidden relative group">
                                    <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-sm">
                                        <Sparkles className="w-8 h-8 text-accent" />
                                    </div>
                                    {user.email[0].toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-text tracking-tight">Account Details</h3>
                                    <p className="text-sm font-semibold text-text/40">Update your public identity and email.</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text/30 ml-1">Full Name</label>
                                    <input 
                                        disabled
                                        defaultValue="Leader CommunitAI"
                                        className="w-full bg-text/3 border border-text/5 rounded-2xl px-6 py-4 text-sm font-black text-text/60 cursor-not-allowed"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text/30 ml-1">Work Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-text/20" />
                                        <input 
                                            disabled
                                            value={user.email}
                                            className="w-full bg-text/3 border border-text/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-black text-text/60 cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Plan Highlight */}
                            <div className="p-10 bg-accent/5 border border-accent/20 rounded-4xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:scale-125 transition-transform duration-700">
                                    <ShieldCheck className="w-32 h-32 text-accent" />
                                </div>
                                <div className="relative z-10 flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="px-3 py-1 bg-accent text-background text-[8px] font-black uppercase tracking-[0.2em] rounded-full">PRO PLAN</span>
                                            <span className="text-[10px] font-black text-accent uppercase tracking-widest">Active</span>
                                        </div>
                                        <h4 className="text-2xl font-black text-text tracking-tight">Strategic Leadership</h4>
                                        <p className="text-sm font-semibold text-text/40 mt-1">Unlimited workspaces and AI memory.</p>
                                    </div>
                                    <button className="px-8 py-4 bg-text text-background rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-text/10 hover:scale-105 transition-transform">Manage</button>
                                </div>
                            </div>
                        </section>

                        <div className="h-px bg-text/5 w-full"></div>

                        {/* Integrations Preview */}
                        <section className="glass-card rounded-4xl p-10 space-y-8">
                            <h3 className="text-2xl font-black text-text tracking-tight">Quick Integrations</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {[
                                    { name: "Slack", icon: Slack, status: "Connected", color: "text-purple-400" },
                                    { name: "GitHub", icon: Github, status: "Available", color: "text-text/40" },
                                ].map(app => (
                                    <div key={app.name} className="p-6 border border-text/5 rounded-3xl flex items-center justify-between hover:border-accent/30 transition-all duration-500 cursor-pointer group bg-text/2">
                                        <div className="flex items-center gap-4">
                                            <div className="p-4 bg-background rounded-2xl group-hover:bg-accent/10 transition-colors shadow-sm">
                                                <app.icon className={`w-6 h-6 ${app.color}`} />
                                            </div>
                                            <div>
                                                <p className="text-base font-black text-text">{app.name}</p>
                                                <p className="text-[9px] font-black text-text/30 uppercase tracking-[0.2em]">{app.status}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-6 h-6 text-text/10 group-hover:text-accent transition-all transform group-hover:translate-x-1" />
                                    </div>
                                ))}
                            </div>
                        </section>

                        <div className="flex items-center justify-end pt-8 gap-4">
                            {saved && <span className="flex items-center gap-1.5 text-[10px] font-black text-accent uppercase tracking-widest animate-in fade-in slide-in-from-right-2"><CheckCircle2 className="w-3.5 h-3.5" /> All settings synced</span>}
                            <button 
                                onClick={handleSave}
                                className="px-10 py-4 bg-accent text-background rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                Save Preferences
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
