"use client";

import { useState } from "react";
import { completeActionItem } from "@/lib/api";
import type { ActionItem } from "@/lib/api";

interface ActionItemCardProps {
    item: ActionItem;
    onComplete?: (id: string) => void;
}

export default function ActionItemCard({ item, onComplete }: ActionItemCardProps) {
    const [loading, setLoading] = useState(false);

    const handleComplete = async () => {
        setLoading(true);
        try {
            await completeActionItem(item.id);
            onComplete?.(item.id);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-start justify-between rounded-lg border border-gray-200 p-3">
            <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{item.description}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                    {item.assignee}
                    {item.due_date && <span> · Due {item.due_date}</span>}
                </p>
            </div>
            <button
                onClick={handleComplete}
                disabled={loading}
                className="ml-3 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            >
                {loading ? "…" : "Done"}
            </button>
        </div>
    );
}
