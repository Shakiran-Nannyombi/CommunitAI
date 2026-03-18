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
    Zap
} from "lucide-react";
import { loadAuth, getWorkspaces, createWorkspace, clearAuth, type AuthUser, type Workspace } from "@/lib/api";
import { Sidebar as AceternitySidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { motion } from "framer-motion";

function SidebarContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentTab = searchParams.get("tab") || "overview";
    
    const [user, setUser] = useState<AuthUser | null>(null);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    
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
            icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
            id: "overview"
        },
        {
            label: "Action Items",
            href: "/dashboard?tab=tasks",
            icon: <CheckSquare className="w-[18px] h-[18px]" />,
            id: "tasks"
        },
        {
            label: "Meetings",
            href: "/dashboard?tab=meetings",
            icon: <Mic className="w-[18px] h-[18px]" />,
            id: "meetings"
        },
        {
            label: "Recording",
            href: "/record",
            icon: <Zap className="w-[18px] h-[18px]" />,
            id: "record"
        },
    ];

    if (!user) return <div className="w-20 shrink-0 bg-background border-r border-text/5 h-screen" />;

    return (
        <>
            <AceternitySidebar open={open} setOpen={setOpen}>
                <SidebarBody className="justify-between gap-6 h-screen border-r border-text/5 z-40 bg-background sticky top-0">
                    <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden gap-6 custom-scrollbar">
                        {/* Logo */}
                        <div className="px-1 py-2 flex items-center h-12 shrink-0 border-b border-text/5 pb-6">
                            {open ? (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-3 w-full"
                                >
                                    <LogoMark size={28} />
                                    <span className="font-bold text-lg text-text tracking-tight mt-0.5">CommunitAI</span>
                                    {user.is_demo && (
                                        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20 tracking-widest uppercase">
                                            Demo
                                        </span>
                                    )}
                                </motion.div>
                            ) : (
                                <div className="mx-auto flex justify-center w-full">
                                    <LogoMark size={28} />
                                </div>
                            )}
                        </div>

                        {/* Nav */}
                        <div className="flex flex-col gap-1.5 mt-2">
                            {navLinks.map(link => {
                                const isActive = link.id === "record" 
                                    ? pathname === "/record" 
                                    : pathname === "/dashboard" && currentTab === link.id;
                                
                                return (
                                    <SidebarLink
                                        key={link.id}
                                        link={link}
                                        active={isActive}
                                    />
                                );
                            })}
                        </div>

                        {/* Workspaces */}
                        <div className="flex flex-col gap-1.5 mt-4">
                            {open ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center justify-between px-3 text-xs font-bold text-text/40 uppercase tracking-widest mb-2"
                                >
                                    <span>Workspaces</span>
                                    <button
                                        onClick={() => setShowWsForm(true)}
                                        className="w-6 h-6 rounded-lg flex items-center justify-center text-text/40 hover:text-text hover:bg-text/5 transition-colors"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </motion.div>
                            ) : (
                                <div className="flex justify-center w-full mb-2">
                                    <button
                                        onClick={() => setShowWsForm(true)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-text/40 hover:text-text hover:bg-text/5 transition-colors"
                                        title="New Workspace"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            )}

                            {loading ? (
                                <div className="flex flex-col gap-2 mt-2 px-2">
                                    <div className="h-8 bg-text/5 rounded-xl animate-pulse" />
                                    <div className="h-8 bg-text/5 rounded-xl animate-pulse" />
                                </div>
                            ) : workspaces.map(ws => (
                                <SidebarLink
                                    key={ws.id}
                                    link={{
                                        label: ws.name,
                                        href: `/workspaces/${ws.id}`,
                                        icon: <span className="text-base leading-none -translate-y-px">{ws.icon_emoji}</span>,
                                    }}
                                    active={pathname.startsWith(`/workspaces/${ws.id}`)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Bottom: user + logout */}
                    <div className="flex flex-col gap-1.5 pt-4 border-t border-text/5 mt-auto bg-background shrink-0">
                        <SidebarLink
                            link={{
                                label: user.display_name || user.email,
                                href: "#",
                                icon: (
                                    <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/30 text-accent font-bold text-[10px] flex items-center justify-center -translate-y-px">
                                        {(user.display_name || user.email)[0].toUpperCase()}
                                    </div>
                                ),
                            }}
                        />
                        <SidebarLink
                            link={{
                                label: "Sign out",
                                href: "#",
                                icon: <LogOut className="w-[18px] h-[18px]" />,
                            }}
                            onClick={(e) => { e.preventDefault(); handleLogout(); }}
                            className="hover:text-red-500 hover:bg-red-500/10"
                        />
                    </div>
                </SidebarBody>
            </AceternitySidebar>

            {/* Global Workspace Modal */}
            {showWsForm && (
                <div className="fixed inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-100 p-4"
                    onClick={() => setShowWsForm(false)}>
                    <form onSubmit={handleCreateWs} onClick={e => e.stopPropagation()}
                        className="bg-background border border-text/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-6">
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

export function Sidebar() {
    return (
        <Suspense fallback={<div className="w-20 shrink-0 bg-background border-r border-text/5 h-screen" />}>
            <SidebarContent />
        </Suspense>
    );
}
