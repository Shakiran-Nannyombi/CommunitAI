import { Sidebar } from "./_components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="app-root flex min-h-screen font-sans">
            <Sidebar />
            <div className="flex-1 min-w-0 bg-[#0a0a0a]">
                {children}
            </div>
        </div>
    );
}
