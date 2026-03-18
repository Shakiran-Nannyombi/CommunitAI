export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ background: "#000", minHeight: "100dvh" }}>
            {children}
        </div>
    );
}
