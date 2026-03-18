import { Sidebar } from "./_components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="app-root flex h-screen overflow-hidden font-sans bg-background">
            <Sidebar />
            <div className="flex-1 min-w-0 overflow-hidden">
                {children}
            </div>
        </div>
    );
}
