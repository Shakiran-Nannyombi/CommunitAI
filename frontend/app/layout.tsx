import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "CommunitAI",
    description: "AI-powered Chief of Staff for community leaders",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
