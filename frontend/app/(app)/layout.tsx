import { Navigation } from "./_components/Navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="app-root flex flex-col md:flex-row h-dvh overflow-hidden font-sans bg-background">
            <Navigation />
            <main className="flex-1 overflow-y-auto pb-20 md:pb-0 min-w-0">
                {children}
            </main>
        </div>
    );
}
