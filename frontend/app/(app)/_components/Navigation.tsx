"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { LogoMark } from "@/components/Logo";
import {
    LayoutDashboard,
    CheckSquare,
    Mic,
    Plus,
    LogOut,
    Zap,
    Settings,
    ChevronLeft,
    ChevronRight,
    Home,
    Rocket,
    Building2,
    GraduationCap,
    Trophy,
    Users as UsersIcon,
    Folder,
    Briefcase,
    Globe,
    Activity,
    Menu,
    X,
} from "lucide-react";
import { loadAuth, getWorkspaces, createWorkspace, clearAuth, type AuthUser, type Workspace } from "@/lib/api";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const ICON_MAP: Record<string, any> = {
    "🏘️": Home, "🚀": Rocket, "🏢": Building2, "🎓": GraduationCap,
    "🏆": Trophy, "🏀": Trophy, "👥": UsersIcon,
    "folder": Folder, "work": Briefcase, "globe": Globe, "activity": Activity, "default": Folder
};

function WorkspaceIcon({ emoji, className }: { emoji: string; className?: string }) {
    const Icon = ICON_MAP[emoji] || ICON_MAP["default"];
    return <Icon className={className} />;
}

function DesktopSidebar({
    user, workspaces, loading, navLinks, pathname, currentTab,
    onLogout, onCreateWs, collapsed, setCollapsed,
}: {
    user: AuthUser; workspaces: Workspace[]; loading: boolean; navLinks: any[];
    pathname: string; currentTab: string; onLogout: () => void; onCreateWs: () => void;
    collapsed: boolean; setCollapsed: (v: boolean) => void;
}) {
    return (
        <motion.aside
            animate={{ width: collapsed ? 72 : 272 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="hidden md:flex flex-col border-r border-text/5 bg-background/50 backdrop-blur-xl shrink-0 h-full relative z-20 overflow-hidden"
        >
            {/* Logo row */}
            <div className="flex items-center h-20 px-4 border-b border-text/5 shrink-0">
                <Link href="/dashboard?tab=overview" className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="shrink-0 p-1.5 rounded-xl bg-accent/10 border border-accent/20">
                        <LogoMark size={26} />
                    </div>
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden whitespace-nowrap"
                            >
                                <p className="text-base font-bold tracking-tight text-text leading-tight">CommunitAI</p>
                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-accent/50">Intelligence Hub</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Link>
                {/* Collapse toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-text/30 hover:text-text hover:bg-text/5 transition-all ml-1"
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                {!collapsed && (
                    <p className="px-3 text-[9px] font-black uppercase tracking-[0.2em] text-text/20 mb-3">Core Systems</p>
                )}
                {navLinks.map(link => {
                    const isActive = link.id === "record"
                        ? pathname === "/record"
                        : link.id === "settings"
                            ? pathname === "/settings"
                            : link.id === "meetings"
                                ? pathname === "/meetings"
                                : link.id === "tasks"
                                    ? pathname === "/tasks"
                                    : pathname === "/dashboard" && currentTab === link.id;

                    return (
                        <Link
                            key={link.id}
                            href={link.href}
                            title={collapsed ? link.label : undefined}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${isActive
                                ? "bg-accent/10 text-accent font-bold"
                                : "text-text/50 hover:text-text hover:bg-text/5 font-semibold"
                                }`}
                        >
                            <span className={`shrink-0 ${isActive ? "text-accent" : "text-text/30 group-hover:text-text/60"} transition-colors`}>
                                {link.icon}
                            </span>
                            <AnimatePresence>
                                {!collapsed && (
                                    <motion.span
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: "auto" }}
                                        exit={{ opacity: 0, width: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="text-sm overflow-hidden whitespace-nowrap"
                                    >
                                        {link.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </Link>
                    );
                })}

                {/* Workspaces */}
                <div className="pt-4">
                    {!collapsed && (
                        <div className="flex items-center justify-between px-3 mb-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text/20">Workspaces</p>
                            <button onClick={onCreateWs} className="p-1 hover:bg-text/5 rounded-md text-text/30 hover:text-text transition-colors">
                                <Plus className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                    {collapsed && (
                        <button
                            onClick={onCreateWs}
                            title="New Workspace"
                            className="w-full flex justify-center py-2 text-text/30 hover:text-text transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                    <div className="space-y-0.5 max-h-40 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            !collapsed && <div className="px-3 py-2 text-xs text-text/30 italic">Loading...</div>
                        ) : workspaces.map(ws => (
                            <Link
                                key={ws.id}
                                href={`/workspaces/${ws.id}`}
                                title={collapsed ? ws.name : undefined}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${pathname.startsWith(`/workspaces/${ws.id}`)
                                    ? "bg-accent/10 text-accent"
                                    : "text-text/50 hover:text-text hover:bg-text/5"
                                    }`}
                            >
                                <div className="w-6 h-6 shrink-0 rounded-lg bg-text/5 flex items-center justify-center group-hover:bg-accent/10 transition-all">
                                    <WorkspaceIcon emoji={ws.icon_emoji} className="w-3.5 h-3.5" />
                                </div>
                                <AnimatePresence>
                                    {!collapsed && (
                                        <motion.span
                                            initial={{ opacity: 0, width: 0 }}
                                            animate={{ opacity: 1, width: "auto" }}
                                            exit={{ opacity: 0, width: 0 }}
                                            transition={{ duration: 0.15 }}
                                            className="text-sm font-medium truncate overflow-hidden whitespace-nowrap"
                                        >
                                            {ws.name}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </Link>
                        ))}
                    </div>
                </div>
            </nav>

            {/* Bottom user card */}
            <div className="px-2 py-3 border-t border-text/5 shrink-0 space-y-1">
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${collapsed ? "justify-center" : ""}`}>
                    <div className="shrink-0 w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-black text-sm">
                        {(user.display_name || user.email)[0].toUpperCase()}
                    </div>
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.15 }}
                                className="min-w-0 overflow-hidden"
                            >
                                <p className="text-xs font-black text-text truncate whitespace-nowrap">{user.display_name || user.email}</p>
                                <p className="text-[8px] text-accent/60 font-black uppercase tracking-widest whitespace-nowrap">PRO MEMBER</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <button
                    onClick={onLogout}
                    title={collapsed ? "Sign out" : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500/50 hover:text-red-500 hover:bg-red-500/5 transition-all ${collapsed ? "justify-center" : ""}`}
                >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.15 }}
                                className="text-xs font-bold uppercase tracking-widest overflow-hidden whitespace-nowrap"
                            >
                                Sign out
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </div>
        </motion.aside>
    );
}

function MobileNav({
    user, navLinks, pathname, currentTab, mobileOpen, setMobileOpen,
    workspaces, loading, onLogout, onCreateWs,
}: {
    user: AuthUser; navLinks: any[]; pathname: string; currentTab: string;
    mobileOpen: boolean; setMobileOpen: (v: boolean) => void;
    workspaces: Workspace[]; loading: boolean; onLogout: () => void; onCreateWs: () => void;
}) {
    return (
        <>
            {/* Top bar */}
            <header className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-text/10 bg-background/90 backdrop-blur-md px-5 py-4">
                <Link href="/dashboard?tab=overview" className="flex items-center gap-2.5">
                    <LogoMark size={22} />
                    <span className="text-base font-bold text-text">CommunitAI</span>
                </Link>
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2 rounded-xl text-text/50 hover:text-text hover:bg-text/5 transition-all"
                >
                    <Menu className="w-5 h-5" />
                </button>
            </header>

            {/* Bottom tab bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around border-t border-text/10 bg-background/95 backdrop-blur-md px-2 py-2 z-40" style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
                {navLinks.slice(0, 5).map(link => {
                    const isActive = link.id === "record"
                        ? pathname === "/record"
                        : link.id === "settings"
                            ? pathname === "/settings"
                            : link.id === "meetings"
                                ? pathname === "/meetings"
                                : link.id === "tasks"
                                    ? pathname === "/tasks"
                                    : pathname === "/dashboard" && currentTab === link.id;

                    return (
                        <Link
                            key={link.id}
                            href={link.href}
                            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${isActive ? "text-accent" : "text-text/40"}`}
                        >
                            <span className={`transition-transform ${isActive ? "scale-110" : ""}`}>{link.icon}</span>
                            <span className="text-[9px] font-bold tracking-wide">{link.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Full-screen mobile drawer */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    >
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="absolute left-0 top-0 bottom-0 w-72 bg-background border-r border-text/10 flex flex-col shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-5 border-b border-text/5">
                                <Link href="/dashboard?tab=overview" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
                                    <LogoMark size={24} />
                                    <span className="font-bold text-text">CommunitAI</span>
                                </Link>
                                <button onClick={() => setMobileOpen(false)} className="p-2 rounded-xl text-text/40 hover:text-text hover:bg-text/5 transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Nav links */}
                            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
                                <p className="px-3 text-[9px] font-black uppercase tracking-[0.2em] text-text/20 mb-3">Core Systems</p>
                                {navLinks.map(link => {
                                    const isActive = link.id === "record"
                                        ? pathname === "/record"
                                        : link.id === "settings"
                                            ? pathname === "/settings"
                                            : link.id === "meetings"
                                                ? pathname === "/meetings"
                                                : link.id === "tasks"
                                                    ? pathname === "/tasks"
                                                    : pathname === "/dashboard" && currentTab === link.id;

                                    return (
                                        <Link
                                            key={link.id}
                                            href={link.href}
                                            onClick={() => setMobileOpen(false)}
                                            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${isActive ? "bg-accent/10 text-accent font-bold" : "text-text/50 hover:text-text hover:bg-text/5"}`}
                                        >
                                            <span className={isActive ? "text-accent" : "text-text/30"}>{link.icon}</span>
                                            <span className="text-sm">{link.label}</span>
                                        </Link>
                                    );
                                })}

                                <div className="pt-4">
                                    <div className="flex items-center justify-between px-3 mb-2">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text/20">Workspaces</p>
                                        <button onClick={() => { onCreateWs(); setMobileOpen(false); }} className="p-1 text-text/30 hover:text-text transition-colors">
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    {loading ? (
                                        <div className="px-3 py-2 text-xs text-text/30 italic">Loading...</div>
                                    ) : workspaces.map(ws => (
                                        <Link
                                            key={ws.id}
                                            href={`/workspaces/${ws.id}`}
                                            onClick={() => setMobileOpen(false)}
                                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-text/50 hover:text-text hover:bg-text/5 transition-all"
                                        >
                                            <div className="w-6 h-6 rounded-lg bg-text/5 flex items-center justify-center">
                                                <WorkspaceIcon emoji={ws.icon_emoji} className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-sm font-medium truncate">{ws.name}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {/* User + logout */}
                            <div className="px-3 py-4 border-t border-text/5 space-y-1">
                                <div className="flex items-center gap-3 px-4 py-3">
                                    <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-black text-sm shrink-0">
                                        {(user.display_name || user.email)[0].toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-black text-text truncate">{user.display_name || user.email}</p>
                                        <p className="text-[9px] text-accent/60 font-black uppercase tracking-widest">PRO MEMBER</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { onLogout(); setMobileOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500/60 hover:text-red-500 hover:bg-red-500/5 transition-all"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="text-sm font-bold">Sign out</span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
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
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const [showWsForm, setShowWsForm] = useState(false);
    const [wsName, setWsName] = useState("");
    const [wsEmoji, setWsEmoji] = useState("🏘️");

    const emojiOptions = [
        { e: "🏘️", l: "Home" }, { e: "🚀", l: "Startup" }, { e: "🏢", l: "Org" },
        { e: "🎓", l: "School" }, { e: "🏆", l: "Club" }, { e: "👥", l: "Team" },
        { e: "work", l: "Work" }, { e: "globe", l: "Global" }
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

    const handleLogout = () => { clearAuth(); router.push("/home"); };

    const handleCreateWs = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wsName.trim() || !user) return;
        await createWorkspace(wsName.trim(), wsEmoji, user.user_id);
        setWsName(""); setWsEmoji("🏘️"); setShowWsForm(false);
        const ws = await getWorkspaces(user.user_id);
        setWorkspaces(ws);
    };

    const navLinks = [
        { label: "Dashboard", href: "/dashboard?tab=overview", icon: <LayoutDashboard className="w-5 h-5" />, id: "overview" },
        { label: "Meetings", href: "/meetings", icon: <Mic className="w-5 h-5" />, id: "meetings" },
        { label: "Tasks", href: "/tasks", icon: <CheckSquare className="w-5 h-5" />, id: "tasks" },
        { label: "Record", href: "/record", icon: <Zap className="w-5 h-5" />, id: "record" },
        { label: "Settings", href: "/settings", icon: <Settings className="w-5 h-5" />, id: "settings" },
    ];

    if (!user) return <div className="hidden md:block w-[272px] border-r border-text/5 bg-background h-full shrink-0" />;

    return (
        <>
            <DesktopSidebar
                user={user} workspaces={workspaces} loading={loading}
                navLinks={navLinks} pathname={pathname} currentTab={currentTab}
                onLogout={handleLogout} onCreateWs={() => setShowWsForm(true)}
                collapsed={collapsed} setCollapsed={setCollapsed}
            />

            <MobileNav
                user={user} navLinks={navLinks} pathname={pathname} currentTab={currentTab}
                mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}
                workspaces={workspaces} loading={loading}
                onLogout={handleLogout} onCreateWs={() => setShowWsForm(true)}
            />

            {/* Workspace Modal */}
            <AnimatePresence>
                {showWsForm && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowWsForm(false)}
                    >
                        <motion.form
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            onSubmit={handleCreateWs} onClick={e => e.stopPropagation()}
                            className="bg-background border border-text/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-6"
                        >
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
                                            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${wsEmoji === opt.e ? "bg-accent/10 border-accent/40 text-accent" : "bg-text/3 border-text/5 text-text/40 hover:border-text/10"}`}
                                        >
                                            <WorkspaceIcon emoji={opt.e} className="w-4 h-4" />
                                            <span className="text-[7px] font-black uppercase tracking-widest">{opt.l}</span>
                                        </button>
                                    ))}
                                </div>
                                <input value={wsName} onChange={e => setWsName(e.target.value)}
                                    placeholder="Workspace name" required
                                    className="w-full bg-text/5 border border-text/10 rounded-xl px-4 py-3 text-sm text-text placeholder-text/30 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all" />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowWsForm(false)}
                                    className="flex-1 py-3 rounded-xl border border-text/10 text-sm font-semibold text-text/50 hover:text-text hover:bg-text/5 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit"
                                    className="flex-1 py-3 rounded-xl bg-accent hover:bg-accent/90 text-background font-bold text-sm shadow-lg shadow-accent/20 transition-all">
                                    Create
                                </button>
                            </div>
                        </motion.form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export function Navigation() {
    return (
        <Suspense fallback={<div className="hidden md:block w-[272px] border-r border-text/5 bg-background h-full shrink-0" />}>
            <NavigationContent />
        </Suspense>
    );
}
