import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "CommunitAI",
    description: "AI-powered Chief of Staff for community leaders",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="dark">
            <body className="min-h-screen bg-black text-white">
                <nav className="border-b border-green-800 px-6 py-4 flex items-center justify-between">
                    <span className="text-green-400 font-bold text-xl tracking-tight">CommunitAI</span>
                    <span className="text-xs text-green-600">AI Chief of Staff</span>
                </nav>
                {children}
            </body>
        </html>
    );
}
