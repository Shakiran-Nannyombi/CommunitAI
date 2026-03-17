"use client";

import { useState } from "react";
import ActionItemCard from "@/components/ActionItemCard";
import type { ActionItem } from "@/lib/api";

interface ActionItemListProps {
    items: ActionItem[];
}

export default function ActionItemList({ items }: ActionItemListProps) {
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    const pending = items.filter(
        (item) => !item.completed && !dismissed.has(item.id)
    );

    const handleComplete = (id: string) => {
        setDismissed((prev) => new Set(prev).add(id));
    };

    if (pending.length === 0) {
        return <p className="text-sm text-gray-500">No pending action items.</p>;
    }

    return (
        <ul className="space-y-2" data-testid="action-item-list">
            {pending.map((item) => (
                <li key={item.id}>
                    <ActionItemCard item={item} onComplete={handleComplete} />
                </li>
            ))}
        </ul>
    );
}
