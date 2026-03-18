export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="app-root" style={{ minHeight: "100dvh" }}>
            {children}
        </div>
    );
}
