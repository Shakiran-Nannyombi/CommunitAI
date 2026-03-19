import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "CommunitAI",
    description: "Record your meetings. Get instant summaries, action items, and AI-generated follow-ups for every community you lead.",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="mkt-root">
            {children}
        </div>
    );
}
