import { SentimentReport } from "@/lib/api";

const classificationConfig: Record<
    SentimentReport["classification"],
    { label: string; className: string }
> = {
    positive: { label: "Positive", className: "bg-green-100 text-green-800" },
    neutral: { label: "Neutral", className: "bg-yellow-100 text-yellow-800" },
    negative: { label: "Negative", className: "bg-red-100 text-red-800" },
};

interface SentimentCardProps {
    report: SentimentReport;
}

export default function SentimentCard({ report }: SentimentCardProps) {
    const { label, className } = classificationConfig[report.classification];

    return (
        <div className="rounded-lg border border-gray-200 p-4">
            <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Sentiment:</span>
                <span
                    data-testid="sentiment-classification"
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
                >
                    {label}
                </span>
            </div>
            {report.signals.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {report.signals.map((signal, index) => (
                        <span
                            key={index}
                            data-testid="sentiment-signal"
                            className="inline-flex flex-col rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-700"
                        >
                            <span className="font-medium">{signal.type}</span>
                            {signal.excerpt && (
                                <span className="mt-0.5 text-gray-500">{signal.excerpt}</span>
                            )}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
