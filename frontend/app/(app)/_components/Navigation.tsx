"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { LogoMark, LogoFull } from "@/components/Logo";
import {
    LayoutDashboard,
    CheckSquare,
    Mic,
    Plus,
    LogOut,
    Zap,
    Bell,
    Settings,
    Grid,
    ChevronDown,
    Search
} from "lucide-react";
import { loadAuth, getWorkspaces, createWorkspace, clearAuth, type AuthUser, type Workspace } from "@/lib/api";
import Link from "next/link";

function Sidebar({ 
    user, 
    workspaces, 
    loading, 
    navLinks, 
    pathname, 
    currentTab, 
    onLogout, 
    onCreateWs 
}: { 
    user: AuthUser, 
    workspaces: Workspace[], 
    loading: boolean, 
    navLinks: any[], 
    pathname: string, 
    currentTab: string, 
    onLogout: () => void, 
    onCreateWs: () => void 
}) {
    const [showWsDropdown, setShowWsDropdown] = useState(false);

    return (
        <aside className="hidden md:flex w-64 border-r border-text/10 flex-col bg-background shrink-0 h-full">
            <div className="p-8 pb-10">
                <Link href="/dashboard?tab=overview" className="flex items-center gap-3">
                    <LogoMark size={32} />
                    <h1 className="text-xl font-bold tracking-tight text-text">CommunitAI</h1>
                </Link>
            </div>

            <nav className="flex-1 px-4 space-y-2">
                <div className="mb-4">
                    <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-text/40 mb-2">Main Menu</p>
                    {navLinks.map(link => {
                        const isActive = link.id === "record" 
                            ? pathname === "/record" 
                            : pathname === "/dashboard" && currentTab === link.id;
                        
                        return (
                            <Link 
                                key={link.id} 
                                href={link.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                                    isActive 
                                    ? "bg-accent/10 text-accent font-bold" 
                                    : "text-text/60 hover:text-text hover:bg-text/5 font-medium"
                                }`}
                            >
                                <span className={`${isActive ? "text-accent" : "text-text/40 group-hover:text-text/60"}`}>
                                    {link.icon}
                                </span>
                                <span className="text-sm">{link.label}</span>
                            </Link>
                        );
                    })}
                </div>

                <div>
                    <div className="flex items-center justify-between px-4 mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text/40">Workspaces</p>
                        <button onClick={onCreateWs} className="p-1 hover:bg-text/5 rounded-md text-text/40 hover:text-text transition-colors">
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar px-2">
                    {loading ? (
                        <div className="px-4 py-2 text-xs text-text/30 italic">Loading spaces...</div>
                    ) : workspaces.map(ws => (
                        <Link 
                            key={ws.id}
                            href={`/workspaces/${ws.id}`}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-text/60 hover:text-text hover:bg-text/5 rounded-lg transition-colors group"
                        >
                            <span className="text-base group-hover:scale-110 transition-transform">{ws.icon_emoji}</span>
                            <span className="truncate">{ws.name}</span>
                        </Link>
                    ))}
                    </div>
                </div>
            </nav>

            <div className="p-4 border-t border-text/10">
                <div className="bg-text/5 rounded-2xl p-3 flex items-center justify-between group cursor-pointer hover:bg-text/10 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold">
                            {(user.display_name || user.email)[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-text truncate">{user.display_name || user.email}</p>
                            <p className="text-[10px] text-text/40 font-bold uppercase">Pro Member</p>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={onLogout}
                    className="w-full mt-2 flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-red-500/60 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                </button>
            </div>
        </aside>
    );
}

function MobileNavbar({ 
    user, 
    navLinks, 
    pathname, 
    currentTab, 
    onLogout, 
    onCreateWs 
}: { 
    user: AuthUser, 
    navLinks: any[], 
    pathname: string, 
    currentTab: string, 
    onLogout: () => void, 
    onCreateWs: () => void 
}) {
    return (
        <>
            <header className="md:hidden sticky top-0 z-50 flex items-center justify-between border-b border-text/10 bg-background/80 backdrop-blur-md px-6 py-4">
                <Link href="/dashboard?tab=overview" className="flex items-center gap-2">
                    <LogoMark size={24} />
                    <span className="text-lg font-bold">CommunitAI</span>
                </Link>
                <div className="flex items-center gap-3">
                    <button className="p-2 text-text/60">
                        <Bell className="w-5 h-5" />
                    </button>
                    <div className="h-8 w-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-xs font-bold">
                        {(user.display_name || user.email)[0].toUpperCase()}
                    </div>
                </div>
            </header>

            <nav className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around border-t border-text/10 bg-background/90 backdrop-blur-md px-4 py-2 z-50 pb-safe">
                {navLinks.map(link => {
                    const isActive = link.id === "record" 
                        ? pathname === "/record" 
                        : pathname === "/dashboard" && currentTab === link.id;
                    
                    return (
                        <Link 
                            key={link.id} 
                            href={link.href}
                            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${isActive ? 'text-accent' : 'text-text/40'}`}
                        >
                            <span className={isActive ? "scale-110" : ""}>{link.icon}</span>
                            <span className="text-[10px] font-bold">{link.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}

function NavigationContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentTab = searchParams.get("tab") || "overview";
    
    const [user, setUser] = useState<AuthUser | null>(null);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Workspace creation state
    const [showWsForm, setShowWsForm] = useState(false);
    const [wsName, setWsName] = useState("");
    const [wsEmoji, setWsEmoji] = useState("🏘️");

    useEffect(() => {
        const auth = loadAuth();
        if (auth) {
            setUser(auth);
            getWorkspaces(auth.user_id).then(setWorkspaces).finally(() => setLoading(false));
        } else {
            router.replace("/login");
        }
    }, [router]);

    const handleLogout = () => {
        clearAuth();
        router.push("/home");
    };

    const handleCreateWs = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wsName.trim() || !user) return;
        await createWorkspace(wsName.trim(), wsEmoji, user.user_id);
        setWsName(""); setWsEmoji("folder"); setShowWsForm(false);
        const ws = await getWorkspaces(user.user_id);
        setWorkspaces(ws);
    };

    const navLinks = [
        {
            label: "Dashboard",
            href: "/dashboard?tab=overview",
            icon: <LayoutDashboard className="w-5 h-5" />,
            id: "overview"
        },
        {
            label: "Meetings",
            href: "/meetings",
            icon: <Mic className="w-5 h-5" />,
            id: "meetings"
        },
        {
            label: "Tasks",
            href: "/tasks",
            icon: <CheckSquare className="w-5 h-5" />,
            id: "tasks"
        },
        {
            label: "Record",
            href: "/record",
            icon: <Zap className="w-5 h-5" />,
            id: "record"
        },
        {
            label: "Settings",
            href: "/settings",
            icon: <Settings className="w-5 h-5" />,
            id: "settings"
        },
    ];

    if (!user) return <div className="hidden md:block w-64 border-r border-text/5 bg-background h-full" />;

    return (
        <>
            <Sidebar 
                user={user} 
                workspaces={workspaces} 
                loading={loading} 
                navLinks={navLinks} 
                pathname={pathname} 
                currentTab={currentTab} 
                onLogout={handleLogout} 
                onCreateWs={() => setShowWsForm(true)} 
            />

            <MobileNavbar 
                user={user} 
                navLinks={navLinks} 
                pathname={pathname} 
                currentTab={currentTab} 
                onLogout={handleLogout} 
                onCreateWs={() => setShowWsForm(true)} 
            />

            {/* Workspace Modal */}
            {showWsForm && (
                <div className="fixed inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={() => setShowWsForm(false)}>
                    <form onSubmit={handleCreateWs} onClick={e => e.stopPropagation()}
                        className="bg-background border border-text/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
                        <div>
                            <h2 className="text-base font-bold text-text">New Workspace</h2>
                            <p className="text-xs text-text/50 mt-1">Create a dedicated space for your community or team.</p>
                        </div>
                        <div className="flex gap-3">
                            <input value={wsEmoji} onChange={e => setWsEmoji(e.target.value)}
                                maxLength={2}
                                className="w-12 bg-text/5 border border-text/10 rounded-xl px-2 py-3 text-center text-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all duration-200" />
                            <input value={wsName} onChange={e => setWsName(e.target.value)}
                                placeholder="Workspace name" required
                                className="flex-1 bg-text/5 border border-text/10 rounded-xl px-4 py-3 text-sm text-text placeholder-text/30 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all duration-200" />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setShowWsForm(false)}
                                className="flex-1 py-3 rounded-xl border border-text/10 text-sm font-semibold text-text/50 hover:text-text hover:bg-text/5 transition-colors">
                                Cancel
                            </button>
                            <button type="submit"
                                className="flex-1 py-3 rounded-xl bg-accent hover:bg-accent/90 text-background font-bold text-sm shadow-lg shadow-accent/20 transition-all">
                                Create Workspace
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}

export function Navigation() {
    return (
        <Suspense fallback={<div className="hidden md:block w-64 border-r border-text/5 bg-background h-full" />}>
            <NavigationContent />
        </Suspense>
    );
}
