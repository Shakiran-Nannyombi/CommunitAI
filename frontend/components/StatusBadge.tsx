import { MeetingStatus } from "@/lib/api";

const statusConfig: Record<MeetingStatus, { label: string; className: string }> = {
    complete: { label: "Complete", className: "bg-green-100 text-green-800" },
    processing: { label: "Processing", className: "bg-blue-100 text-blue-800" },
    pending: { label: "Pending", className: "bg-gray-100 text-gray-800" },
    transcribed: { label: "Transcribed", className: "bg-teal-100 text-teal-800" },
    transcription_failed: { label: "Transcription Failed", className: "bg-red-100 text-red-800" },
    analysis_failed: { label: "Analysis Failed", className: "bg-red-100 text-red-800" },
    summarization_failed: { label: "Summarization Failed", className: "bg-red-100 text-red-800" },
};

interface StatusBadgeProps {
    status: MeetingStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
    const { label, className } = statusConfig[status];
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
            {label}
        </span>
    );
}
