import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
    title: "CommunitAI — AI Chief of Staff for Community Leaders",
    description: "Record your meetings. Get instant summaries, action items, and AI-generated follow-ups for every community you lead.",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: "#fff", color: "#111" }}>
            {children}
        </div>
    );
}
