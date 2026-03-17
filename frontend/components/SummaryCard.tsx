"use client";

interface SummaryCardProps {
    summary: string;
}

export default function SummaryCard({ summary }: SummaryCardProps) {
    const handleCopy = () => {
        navigator.clipboard.writeText(summary);
    };

    return (
        <div className="rounded-lg border border-gray-200 p-4">
            <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Summary</span>
                <button
                    onClick={handleCopy}
                    className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                >
                    Copy
                </button>
            </div>
            <p className="whitespace-pre-wrap text-sm text-gray-800">{summary}</p>
        </div>
    );
}
