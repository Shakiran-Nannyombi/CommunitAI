"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadAuth, clearAuth, type AuthUser } from "@/lib/api";
import {
    User, Mail, Bell, Shield, Settings as SettingsIcon,
    Slack, Github, ChevronRight, LogOut,
    CheckCircle2, Sparkles, Zap, ShieldCheck, Lock, Eye, EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "profile" | "integrations" | "security" | "notifications";

export default function SettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>("profile");

    // Security tab state
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");

    // Notifications tab state
    const [notifs, setNotifs] = useState({
        meetingComplete: true,
        actionItemDue: true,
        weeklyDigest: false,
        teamNudges: true,
    });

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

    const tabs: { id: Tab; label: string; icon: any }[] = [
        { id: "profile", label: "Profile", icon: User },
        { id: "integrations", label: "Integrations", icon: Zap },
        { id: "security", label: "Security", icon: Shield },
        { id: "notifications", label: "Notifications", icon: Bell },
    ];

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
                        {tabs.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === item.id
                                        ? "bg-text text-background shadow-xl shadow-text/5"
                                        : "text-text/30 hover:text-text/60 hover:bg-text/5"
                                    }`}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                                {activeTab === item.id && <ChevronRight className="w-3 h-3 ml-auto" />}
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
                        <AnimatePresence mode="wait">
                            {activeTab === "profile" && (
                                <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-12">
                                    <section className="glass-card rounded-4xl p-10 space-y-10">
                                        <div className="flex items-center gap-6">
                                            <div className="w-24 h-24 rounded-4xl bg-accent/10 border-4 border-background ring-2 ring-accent/20 flex items-center justify-center text-4xl font-black shadow-xl overflow-hidden relative group">
                                                <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-sm">
                                                    <Sparkles className="w-8 h-8 text-accent" />
                                                </div>
                                                {user.email[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-text tracking-tight">Account Details</h3>
                                                <p className="text-sm font-semibold text-text/40">Your public identity and email.</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text/30 ml-1">Display Name</label>
                                                <input
                                                    defaultValue={user.display_name || user.email.split("@")[0]}
                                                    className="w-full bg-text/3 border border-text/5 rounded-2xl px-6 py-4 text-sm font-black text-text focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all"
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

                                    <div className="flex items-center justify-end gap-4">
                                        {saved && <span className="flex items-center gap-1.5 text-[10px] font-black text-accent uppercase tracking-widest animate-in fade-in"><CheckCircle2 className="w-3.5 h-3.5" /> Saved</span>}
                                        <button onClick={handleSave} className="px-10 py-4 bg-accent text-background rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all">
                                            Save Changes
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === "integrations" && (
                                <motion.div key="integrations" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-8">
                                    <section className="glass-card rounded-4xl p-10 space-y-8">
                                        <h3 className="text-2xl font-black text-text tracking-tight">Connected Apps</h3>
                                        <p className="text-sm text-text/40 font-semibold">Connect your tools to unlock automated sharing and notifications.</p>
                                        <div className="space-y-4">
                                            {[
                                                { name: "Slack", icon: Slack, status: "Connected", color: "text-purple-400", desc: "Post meeting summaries to channels automatically." },
                                                { name: "GitHub", icon: Github, status: "Not connected", color: "text-text/40", desc: "Link action items to issues and pull requests." },
                                            ].map(app => (
                                                <div key={app.name} className="p-6 border border-text/5 rounded-3xl flex items-center justify-between hover:border-accent/30 transition-all duration-500 group bg-text/2">
                                                    <div className="flex items-center gap-5">
                                                        <div className="p-4 bg-background rounded-2xl group-hover:bg-accent/10 transition-colors shadow-sm">
                                                            <app.icon className={`w-6 h-6 ${app.color}`} />
                                                        </div>
                                                        <div>
                                                            <p className="text-base font-black text-text">{app.name}</p>
                                                            <p className="text-[9px] font-black text-text/30 uppercase tracking-[0.2em]">{app.status}</p>
                                                            <p className="text-xs text-text/40 mt-1">{app.desc}</p>
                                                        </div>
                                                    </div>
                                                    <button className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${app.status === "Connected" ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-accent/10 text-accent hover:bg-accent/20"}`}>
                                                        {app.status === "Connected" ? "Disconnect" : "Connect"}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </motion.div>
                            )}

                            {activeTab === "security" && (
                                <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-8">
                                    <section className="glass-card rounded-4xl p-10 space-y-8">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-accent/10 rounded-2xl text-accent"><Lock className="w-5 h-5" /></div>
                                            <h3 className="text-2xl font-black text-text tracking-tight">Change Password</h3>
                                        </div>
                                        <div className="space-y-5">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text/30 ml-1">Current Password</label>
                                                <div className="relative">
                                                    <input
                                                        type={showCurrentPw ? "text" : "password"}
                                                        value={currentPw}
                                                        onChange={e => setCurrentPw(e.target.value)}
                                                        placeholder="••••••••"
                                                        className="w-full bg-text/3 border border-text/5 rounded-2xl px-6 py-4 pr-14 text-sm font-black text-text focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all placeholder:text-text/20"
                                                    />
                                                    <button onClick={() => setShowCurrentPw(v => !v)} className="absolute right-5 top-1/2 -translate-y-1/2 text-text/30 hover:text-text transition-colors">
                                                        {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text/30 ml-1">New Password</label>
                                                <div className="relative">
                                                    <input
                                                        type={showNewPw ? "text" : "password"}
                                                        value={newPw}
                                                        onChange={e => setNewPw(e.target.value)}
                                                        placeholder="Min. 8 characters"
                                                        className="w-full bg-text/3 border border-text/5 rounded-2xl px-6 py-4 pr-14 text-sm font-black text-text focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all placeholder:text-text/20"
                                                    />
                                                    <button onClick={() => setShowNewPw(v => !v)} className="absolute right-5 top-1/2 -translate-y-1/2 text-text/30 hover:text-text transition-colors">
                                                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                                {newPw.length > 0 && newPw.length < 8 && (
                                                    <p className="text-[10px] text-red-500 font-black uppercase tracking-widest ml-1">Too short — min 8 characters</p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleSave}
                                            disabled={!currentPw || newPw.length < 8}
                                            className="px-10 py-4 bg-accent text-background rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            Update Password
                                        </button>
                                        {saved && <p className="flex items-center gap-2 text-[10px] font-black text-accent uppercase tracking-widest"><CheckCircle2 className="w-3.5 h-3.5" /> Password updated</p>}
                                    </section>
                                </motion.div>
                            )}

                            {activeTab === "notifications" && (
                                <motion.div key="notifications" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-8">
                                    <section className="glass-card rounded-4xl p-10 space-y-8">
                                        <h3 className="text-2xl font-black text-text tracking-tight">Notification Preferences</h3>
                                        <div className="space-y-4">
                                            {[
                                                { key: "meetingComplete" as const, label: "Meeting Processed", desc: "Get notified when AI finishes analyzing a meeting." },
                                                { key: "actionItemDue" as const, label: "Action Item Due", desc: "Reminders before tasks reach their due date." },
                                                { key: "weeklyDigest" as const, label: "Weekly Digest", desc: "A summary of your team's activity every Monday." },
                                                { key: "teamNudges" as const, label: "Team Nudges", desc: "Alerts when a nudge is sent to a team member." },
                                            ].map(item => (
                                                <div key={item.key} className="flex items-center justify-between p-6 border border-text/5 rounded-3xl bg-text/2 hover:border-accent/20 transition-all">
                                                    <div>
                                                        <p className="text-sm font-black text-text">{item.label}</p>
                                                        <p className="text-xs text-text/40 mt-0.5">{item.desc}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => setNotifs(n => ({ ...n, [item.key]: !n[item.key] }))}
                                                        className={`relative w-12 h-6 rounded-full transition-all duration-300 ${notifs[item.key] ? "bg-accent" : "bg-text/10"}`}
                                                    >
                                                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${notifs[item.key] ? "left-7" : "left-1"}`} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex items-center justify-end gap-4">
                                            {saved && <span className="flex items-center gap-1.5 text-[10px] font-black text-accent uppercase tracking-widest animate-in fade-in"><CheckCircle2 className="w-3.5 h-3.5" /> Saved</span>}
                                            <button onClick={handleSave} className="px-10 py-4 bg-accent text-background rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all">
                                                Save Preferences
                                            </button>
                                        </div>
                                    </section>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
