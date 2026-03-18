"use client";

import { useEffect, useState } from "react";
import { getImpact, type ImpactOut } from "@/lib/api";

interface Props {
    workspaceId: string;
}

const SENTIMENT_BADGE: Record<string, string> = {
    positive: "bg-green-900/40 border-green-700 text-green-400",
    neutral: "bg-yellow-900/40 border-yellow-700 text-yellow-400",
    negative: "bg-red-900/40 border-red-700 text-red-400",
};

export default function ImpactTab({ workspaceId }: Props) {
    const [impact, setImpact] = useState<ImpactOut | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        getImpact(workspaceId)
            .then(setImpact)
            .catch(() => setError("Failed to load impact data."))
            .finally(() => setLoading(false));
    }, [workspaceId]);

    if (loading) return (
        <div className="flex items-center justify-center py-12">
            <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (error) return (
        <p className="text-xs text-red-400 py-6 text-center">{error}</p>
    );

    if (!impact) return null;

    if (!impact.has_enough_data) return (
        <div className="bg-zinc-950 border border-zinc-800 rounded px-6 py-10 text-center">
            <p className="text-zinc-500 text-sm">Not enough data yet.</p>
            <p className="text-zinc-700 text-xs mt-1">Add more meetings to see trends and analytics.</p>
        </div>
    );

    const completionPct = Math.round(impact.completion_rate * 100);

    return (
        <div className="space-y-4">
            {/* Meetings per week */}
            <section className="bg-zinc-950 border border-zinc-800 rounded">
                <div className="px-4 py-2.5 border-b border-zinc-800">
                    <span className="text-xs text-zinc-500 uppercase tracking-widest">Meetings / Week (last 12 weeks)</span>
                </div>
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-zinc-800">
                            <th className="px-4 py-2 text-left text-zinc-600 font-normal">Week starting</th>
                            <th className="px-4 py-2 text-right text-zinc-600 font-normal">Meetings</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                        {impact.meetings_per_week.map((row, i) => (
                            <tr key={i} className="hover:bg-zinc-900/30 transition">
                                <td className="px-4 py-2 text-zinc-400">{row.week_start}</td>
                                <td className="px-4 py-2 text-right text-zinc-300 tabular-nums">{row.count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {/* Completion rate */}
            <section className="bg-zinc-950 border border-zinc-800 rounded px-4 py-4 flex items-center justify-between">
                <span className="text-xs text-zinc-500 uppercase tracking-widest">Task Completion Rate</span>
                <span className="text-2xl font-bold text-green-400 tabular-nums">{completionPct}%</span>
            </section>

            {/* Sentiment trend */}
            <section className="bg-zinc-950 border border-zinc-800 rounded">
                <div className="px-4 py-2.5 border-b border-zinc-800">
                    <span className="text-xs text-zinc-500 uppercase tracking-widest">Sentiment Trend (recent meetings)</span>
                </div>
                {impact.sentiment_trend.length === 0 ? (
                    <p className="px-4 py-4 text-xs text-zinc-700">No sentiment data yet.</p>
                ) : (
                    <div className="px-4 py-3 flex flex-wrap gap-2">
                        {impact.sentiment_trend.map((item, i) => (
                            <div key={i} className="flex flex-col items-center gap-1">
                                <span
                                    className={`text-xs px-2 py-0.5 rounded border capitalize ${SENTIMENT_BADGE[item.classification] ?? "border-zinc-700 text-zinc-400"}`}
                                >
                                    {item.classification}
                                </span>
                                <span className="text-[10px] text-zinc-700 max-w-[80px] truncate text-center" title={item.meeting_title}>
                                    {item.meeting_title}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Top assignees */}
            <section className="bg-zinc-950 border border-zinc-800 rounded">
                <div className="px-4 py-2.5 border-b border-zinc-800">
                    <span className="text-xs text-zinc-500 uppercase tracking-widest">Top Assignees</span>
                </div>
                {impact.top_assignees.length === 0 ? (
                    <p className="px-4 py-4 text-xs text-zinc-700">No assignee data yet.</p>
                ) : (
                    <ol className="divide-y divide-zinc-800/50">
                        {impact.top_assignees.map((a, i) => (
                            <li key={i} className="flex items-center justify-between px-4 py-2.5">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-zinc-700 w-4 tabular-nums">{i + 1}.</span>
                                    <span className="text-sm text-zinc-300">{a.assignee || "Unassigned"}</span>
                                </div>
                                <span className="text-xs text-zinc-500 tabular-nums">{a.task_count} tasks</span>
                            </li>
                        ))}
                    </ol>
                )}
            </section>
        </div>
    );
}
