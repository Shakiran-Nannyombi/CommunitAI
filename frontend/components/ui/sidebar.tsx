"use client";

import { cn } from "@/lib/utils";
import Link, { LinkProps } from "next/link";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

interface Links {
    label: string;
    href: string;
    icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
};

export const SidebarProvider = ({
    children,
    open: openProp,
    setOpen: setOpenProp,
    animate = true,
}: {
    children: React.ReactNode;
    open?: boolean;
    setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    animate?: boolean;
}) => {
    const [openState, setOpenState] = useState(false);

    const open = openProp !== undefined ? openProp : openState;
    const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

    return (
        <SidebarContext.Provider value={{ open, setOpen, animate }}>
            {children}
        </SidebarContext.Provider>
    );
};

export const Sidebar = ({
    children,
    open,
    setOpen,
    animate,
}: {
    children: React.ReactNode;
    open?: boolean;
    setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    animate?: boolean;
}) => {
    return (
        <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
            {children}
        </SidebarProvider>
    );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
    return (
        <>
            <DesktopSidebar {...props} />
            <MobileSidebar {...(props as React.ComponentProps<"div">)} />
        </>
    );
};

export const DesktopSidebar = ({
    className,
    children,
    ...props
}: React.ComponentProps<typeof motion.div>) => {
    const { open, setOpen, animate } = useSidebar();
    return (
        <motion.div
            className={cn(
                "h-full px-4 py-6 hidden md:flex md:flex-col bg-(--background) border-r border-text/5 w-[280px] shrink-0 transition-colors",
                className
            )}
            animate={{
                width: animate ? (open ? "280px" : "80px") : "280px",
            }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            {...props}
        >
            {children}
        </motion.div>
    );
};

export const MobileSidebar = ({
    className,
    children,
    ...props
}: React.ComponentProps<"div">) => {
    const { open, setOpen } = useSidebar();
    return (
        <>
            <div
                className={cn(
                    "h-14 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-(--background) border-b border-text/5 w-full transition-colors"
                )}
                {...props}
            >
                <div className="flex justify-end z-20 w-full">
                    <Menu
                        className="text-text/70 cursor-pointer"
                        onClick={() => setOpen(!open)}
                    />
                </div>
                <AnimatePresence>
                    {open && (
                        <motion.div
                            initial={{ x: "-100%", opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: "-100%", opacity: 0 }}
                            transition={{
                                duration: 0.3,
                                ease: "easeInOut",
                            }}
                            className={cn(
                                "fixed h-full w-full inset-0 bg-(--background) p-10 z-100 flex flex-col justify-between transition-colors",
                                className
                            )}
                        >
                            <div
                                className="absolute right-10 top-10 z-50 text-text/70 cursor-pointer"
                                onClick={() => setOpen(!open)}
                            >
                                <X />
                            </div>
                            {children}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
};

export const SidebarLink = ({
    link,
    className,
    active,
    ...props
}: {
    link: Links;
    className?: string;
    props?: LinkProps;
    active?: boolean;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) => {
    const { open, animate } = useSidebar();
    return (
        <Link
            href={link.href}
            className={cn(
                "flex items-center justify-start gap-3 group/sidebar py-2.5 px-3 rounded-xl transition-all duration-200",
                active ? "bg-accent/10 text-accent font-semibold" : "text-text/60 hover:text-text hover:bg-text/5",
                className
            )}
            {...props}
        >
            <div className={cn("shrink-0 flex items-center justify-center transition-colors", active ? "text-accent" : "text-text/40 group-hover/sidebar:text-text/60")}>
                {link.icon}
            </div>
            <motion.span
                animate={{
                    display: animate ? (open ? "inline-block" : "none") : "inline-block",
                    opacity: animate ? (open ? 1 : 0) : 1,
                }}
                className="text-sm tracking-tight whitespace-pre inline-block p-0! m-0! transition-opacity overflow-hidden"
            >
                {link.label}
            </motion.span>
        </Link>
    );
};
