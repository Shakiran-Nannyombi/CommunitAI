import Image from "next/image";

/**
 * LogoMark — renders the SVG from /public/logo.svg as an <img> asset.
 * Use this everywhere so the logo is a real media file, not inline code.
 */
export function LogoMark({
    size = 32,
    className,
}: {
    size?: number;
    className?: string;
}) {
    return (
        <Image
            src="/logo.svg"
            alt="CommunitAI logo"
            width={size}
            height={size}
            className={className}
            priority
        />
    );
}

/** Full wordmark: logo icon + "CommunitAI" text side by side */
export function LogoFull({
    size = 32,
    variant = "dark",
}: {
    size?: number;
    variant?: "dark" | "light";
}) {
    const textColor = variant === "dark" ? "var(--accent)" : "var(--text)";
    const aiColor = variant === "dark" ? "var(--accent)" : "var(--primary)";
    const fontSize = Math.round(size * 0.56);

    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <LogoMark size={size} />
            <span style={{
                fontWeight: 800,
                fontSize: `${fontSize}px`,
                letterSpacing: "0.04em",
                color: textColor,
                lineHeight: 1,
            }}>
                Communit<span style={{ color: aiColor }}>AI</span>
            </span>
        </span>
    );
}
