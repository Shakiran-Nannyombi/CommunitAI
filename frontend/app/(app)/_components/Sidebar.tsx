"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    LayoutDashboard,
    CheckSquare,
    Mic,
    Plus,
    LogOut,
    Zap
} from "lucide-react";
import { loadAuth, getWorkspaces, clearAuth, type AuthUser, type Workspace } from "@/lib/api";

export function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentTab = searchParams.get("tab") || "overview";
    
    const [user, setUser] = useState<AuthUser | null>(null);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const auth = loadAuth();
        if (auth) {
            setUser(auth);
            getWorkspaces(auth.user_id).then(setWorkspaces).finally(() => setLoading(false));
        } else {
            router.replace("/login");
        }
    }, [router]);

    const logout = () => {
        clearAuth();
        router.push("/login");
    };

    const navItems = [
        { id: "overview", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard?tab=overview" },
        { id: "tasks", label: "Action Items", icon: CheckSquare, href: "/dashboard?tab=tasks" },
        { id: "meetings", label: "Meetings", icon: Mic, href: "/dashboard?tab=meetings" },
        { id: "record", label: "Recording", icon: Zap, href: "/record" },
    ];

    return (
        <aside className="w-72 shrink-0 bg-[#0d0d0d] border-r border-white/5 flex flex-col h-screen sticky top-0 overflow-hidden">
            {/* Logo */}
            <div className="p-8 pb-6">
                <Link href="/dashboard" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-all duration-300 shadow-lg shadow-emerald-500/5">
                        <Zap className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <span className="text-white font-bold text-xl tracking-tight block">CommunitAI</span>
                        <span className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest block -mt-1">Chief of Staff</span>
                    </div>
                </Link>
            </div>

            {/* Main Nav */}
            <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                <div className="px-4 mb-4 mt-2">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Platform</p>
                </div>
                {navItems.map((item) => {
                    const isActive = item.id === "record" 
                        ? pathname === "/record" 
                        : pathname === "/dashboard" && currentTab === item.id;
                    
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 group ${
                                isActive
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5"
                                    : "text-zinc-500 hover:text-white hover:bg-white/5 border border-transparent"
                            }`}
                        >
                            <item.icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? "text-emerald-400" : "text-zinc-600 group-hover:text-zinc-400"}`} />
                            {item.label}
                        </Link>
                    );
                })}

                <div className="px-4 mb-4 mt-10 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Workspaces</p>
                    <button className="text-zinc-600 hover:text-emerald-400 transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>
                {loading ? (
                    <div className="space-y-2 px-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-12 bg-white/5 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : workspaces.length === 0 ? (
                    <div className="px-4 py-6 text-center border border-dashed border-white/5 rounded-2xl">
                        <p className="text-xs text-zinc-600">No workspaces yet</p>
                    </div>
                ) : (
                    workspaces.map((ws) => {
                        const isActive = pathname.startsWith(`/workspaces/${ws.id}`);
                        return (
                            <Link
                                key={ws.id}
                                href={`/workspaces/${ws.id}`}
                                className={`flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 group ${
                                    isActive
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5"
                                        : "text-zinc-500 hover:text-white hover:bg-white/5 border border-transparent"
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${isActive ? "bg-emerald-500/20" : "bg-white/5 group-hover:bg-white/10"}`}>
                                    <LayoutDashboard className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-zinc-600 group-hover:text-zinc-400"}`} />
                                </div>
                                <span className="truncate">{ws.name}</span>
                            </Link>
                        );
                    })
                )}
            </nav>

            {/* User / Footer */}
            <div className="p-4 mt-auto">
                {user && (
                    <div className="flex items-center gap-3 p-3.5 rounded-4xl bg-zinc-900/50 border border-white/5 backdrop-blur-xl">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-sm font-bold text-emerald-400 border border-emerald-500/20 shadow-inner">
                            {user.display_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{user.display_name || user.email}</p>
                            <p className="text-[10px] font-bold text-zinc-500 truncate uppercase tracking-tight">{user.is_demo ? "Demo Account" : "Pro Plan"}</p>
                        </div>
                        <button onClick={logout} className="p-2.5 rounded-full text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}
