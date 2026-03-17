import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import type { MeetingListItem } from "@/lib/api";

const SENTIMENT_COLOR: Record<string, string> = {
    positive: "bg-green-400",
    neutral: "bg-yellow-400",
    negative: "bg-red-400",
};

interface MeetingListProps {
    meetings: MeetingListItem[];
    sentimentMap?: Record<string, "positive" | "neutral" | "negative">;
}

export default function MeetingList({
    meetings,
    sentimentMap = {},
}: MeetingListProps) {
    if (meetings.length === 0) {
        return <p className="text-sm text-gray-500">No meetings yet.</p>;
    }

    return (
        <ul className="space-y-2">
            {meetings.map((meeting) => {
                const sentiment = sentimentMap[meeting.id];
                return (
                    <li key={meeting.id}>
                        <Link
                            href={`/meetings/${meeting.id}`}
                            className="flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                        >
                            <div className="flex items-center gap-3">
                                {sentiment && (
                                    <span
                                        className={`h-2.5 w-2.5 rounded-full ${SENTIMENT_COLOR[sentiment]}`}
                                        aria-label={`Sentiment: ${sentiment}`}
                                    />
                                )}
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        {meeting.title}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(meeting.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <StatusBadge status={meeting.status} />
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}
