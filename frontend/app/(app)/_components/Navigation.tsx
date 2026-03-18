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
    Search,
    Home,
    Rocket,
    Building2,
    GraduationCap,
    Trophy,
    Users as UsersIcon,
    Folder,
    Briefcase,
    Globe,
    Activity
} from "lucide-react";
import { loadAuth, getWorkspaces, createWorkspace, clearAuth, type AuthUser, type Workspace } from "@/lib/api";
import Link from "next/link";

const ICON_MAP: Record<string, any> = {
    "🏘️": Home,
    "🚀": Rocket,
    "🏢": Building2,
    "🎓": GraduationCap,
    "🏆": Trophy, // Added trophy for sports
    "🏀": Trophy, 
    "👥": UsersIcon,
    "folder": Folder,
    "work": Briefcase,
    "globe": Globe,
    "activity": Activity,
    "default": Folder
};

function WorkspaceIcon({ emoji, className }: { emoji: string; className?: string }) {
    const Icon = ICON_MAP[emoji] || ICON_MAP["default"];
    return <Icon className={className} />;
}

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
        <aside className="hidden md:flex w-72 border-r border-text/5 flex-col bg-background/50 backdrop-blur-xl shrink-0 h-full relative z-20">
            <div className="p-10 pb-12">
                <Link href="/dashboard?tab=overview" className="flex items-center gap-4 group">
                    <div className="p-2 rounded-2xl bg-accent/10 border border-accent/20 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-accent/5">
                        <LogoMark size={32} />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold tracking-tighter text-text leading-tight">CommunitAI</h1>
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-accent/50">Intelligence Hub</span>
                    </div>
                </Link>
            </div>

            <nav className="flex-1 px-4 space-y-2">
                <div className="mb-4">
                    <p className="px-6 text-[10px] font-black uppercase tracking-[0.2em] text-text/20 mb-4">Core Systems</p>
                    {navLinks.map(link => {
                        const isActive = link.id === "record" 
                            ? pathname === "/record" 
                            : pathname === "/dashboard" && currentTab === link.id;
                        
                        return (
                            <Link 
                                key={link.id} 
                                href={link.href}
                                className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${
                                    isActive 
                                    ? "bg-accent/10 text-accent font-bold shadow-sm shadow-accent/5" 
                                    : "text-text/50 hover:text-text hover:bg-text/5 font-semibold"
                                }`}
                            >
                                <span className={`${isActive ? "text-accent scale-110" : "text-text/30 group-hover:text-text/60 group-hover:scale-110"} transition-all duration-300`}>
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
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-text/60 hover:text-text hover:bg-text/5 rounded-xl transition-all group"
                        >
                            <div className="w-7 h-7 rounded-lg bg-text/5 flex items-center justify-center group-hover:bg-accent/10 group-hover:text-accent transition-all">
                                <WorkspaceIcon emoji={ws.icon_emoji} className="w-3.5 h-3.5" />
                            </div>
                            <span className="truncate font-medium">{ws.name}</span>
                        </Link>
                    ))}
                    </div>
                </div>
            </nav>

            <div className="p-6 border-t border-text/5 space-y-4">
                <div className="glass-card rounded-4xl p-4 flex items-center justify-between group cursor-pointer hover:border-accent/30 transition-all duration-500">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-12 w-12 shrink-0 rounded-[1.25rem] bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-black text-lg shadow-inner">
                            {(user.display_name || user.email)[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-black text-text truncate tracking-tight">{user.display_name || user.email}</p>
                            <p className="text-[9px] text-accent/60 font-black uppercase tracking-widest">PRO MEMBER</p>
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

    const emojiOptions = [
        { e: "🏘️", l: "Home" },
        { e: "🚀", l: "Startup" },
        { e: "🏢", l: "Org" },
        { e: "🎓", l: "School" },
        { e: "🏆", l: "Club" },
        { e: "👥", l: "Team" },
        { e: "work", l: "Work" },
        { e: "globe", l: "Global" }
    ];

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
                        <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-2">
                                {emojiOptions.map(opt => (
                                    <button 
                                        key={opt.e} type="button" 
                                        onClick={() => setWsEmoji(opt.e)}
                                        className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${wsEmoji === opt.e ? 'bg-accent/10 border-accent/40 text-accent' : 'bg-text/3 border-text/5 text-text/40 hover:border-text/10'}`}
                                    >
                                        <WorkspaceIcon emoji={opt.e} className="w-4 h-4" />
                                        <span className="text-[7px] font-black uppercase tracking-widest">{opt.l}</span>
                                    </button>
                                ))}
                            </div>
                            <input value={wsName} onChange={e => setWsName(e.target.value)}
                                placeholder="Workspace name (e.g. Marketing Team)" required
                                className="w-full bg-text/5 border border-text/10 rounded-xl px-4 py-3 text-sm text-text placeholder-text/30 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all duration-200" />
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
