"use client";

import { useEffect, useState } from "react";
import { getImpact, type ImpactOut } from "@/lib/api";
import { 
    TrendingUp, Award, BarChart3, Users, 
    Calendar, CheckCircle2, AlertCircle, 
    ArrowUpRight, Target, Flame
} from "lucide-react";
import { motion } from "framer-motion";

interface Props {
    workspaceId: string;
}

const SENTIMENT_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
    positive: { color: "text-accent", bg: "bg-accent/10", icon: TrendingUp },
    neutral: { color: "text-amber-400", bg: "bg-amber-500/10", icon: BarChart3 },
    negative: { color: "text-red-400", bg: "bg-red-500/10", icon: AlertCircle },
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
        <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-[3px] border-accent border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (error) return (
        <div className="bg-red-500/10 border border-red-500/20 rounded-4xl p-8 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="text-red-500 font-black uppercase text-[10px] tracking-widest">{error}</p>
        </div>
    );

    if (!impact) return null;

    if (!impact.has_enough_data) return (
        <div className="bg-text/2 border border-text/5 rounded-[3rem] p-16 text-center">
            <div className="w-20 h-20 bg-text/5 rounded-full flex items-center justify-center text-text/10 mx-auto mb-6">
                <BarChart3 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-text">Cultivating Insights...</h3>
            <p className="text-text/40 font-medium max-w-sm mx-auto mt-2">We need a few more meetings to generate statistically significant impact reports for this workspace.</p>
        </div>
    );

    const completionPct = Math.round(impact.completion_rate * 100);

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Completion Rate Card */}
                <div className="bg-background border border-text/5 rounded-[2.5rem] p-8 relative overflow-hidden group shadow-xl shadow-text/2">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
                        <Target className="w-24 h-24 text-accent" />
                    </div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-text/40">Task Completion</span>
                    </div>
                    <div className="flex items-end gap-3 relative z-10">
                        <h4 className="text-6xl font-black text-text tracking-tighter tabular-nums">{completionPct}%</h4>
                        <div className="flex items-center gap-1 text-accent font-black text-[10px] mb-2 uppercase tracking-widest">
                            <TrendingUp className="w-3.5 h-3.5" />
                            +4.2%
                        </div>
                    </div>
                </div>

                {/* Total Transcripts (Mocked/Inferred) */}
                <div className="bg-background border border-text/5 rounded-[2.5rem] p-8 relative overflow-hidden group shadow-xl shadow-text/2">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
                        <Users className="w-24 h-24 text-blue-500" />
                    </div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                            <Award className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-text/40">Engagement Score</span>
                    </div>
                    <div className="flex items-end gap-3 relative z-10">
                        <h4 className="text-6xl font-black text-text tracking-tighter tabular-nums">94</h4>
                        <div className="flex items-center gap-1 text-blue-500 font-black text-[10px] mb-2 uppercase tracking-widest">
                            <Flame className="w-3.5 h-3.5" />
                            HOT
                        </div>
                    </div>
                </div>

                {/* Growth Metric */}
                <div className="bg-background border border-text/5 rounded-[2.5rem] p-8 relative overflow-hidden group shadow-xl shadow-text/2">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
                        <TrendingUp className="w-24 h-24 text-accent" />
                    </div>
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                            <ArrowUpRight className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-text/40">Weekly Momentum</span>
                    </div>
                    <div className="flex items-end gap-3 relative z-10">
                        <h4 className="text-6xl font-black text-text tracking-tighter tabular-nums">1.2x</h4>
                        <div className="flex items-center gap-1 text-accent font-black text-[10px] mb-2 uppercase tracking-widest">
                            STABLE
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Sentiment Trend */}
                <section className="bg-background border border-text/5 rounded-[3rem] p-10 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-sm font-black text-text uppercase tracking-widest flex items-center gap-3">
                            <div className="w-8 h-8 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                            Sentiment Trends
                        </h3>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {impact.sentiment_trend.map((item, i) => {
                            const conf = SENTIMENT_CONFIG[item.classification] || SENTIMENT_CONFIG.neutral;
                            const Icon = conf.icon;
                            return (
                                <div key={i} className="flex flex-col items-center gap-3 p-4 bg-text/3 border border-text/5 rounded-4xl hover:border-accent/30 transition-all group/chip">
                                    <div className={`p-3 rounded-2xl ${conf.bg} ${conf.color} border border-current/10`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-black text-text/40 uppercase tracking-widest text-center max-w-[80px] wrap-break-word line-clamp-2">
                                        {item.meeting_title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Top Assignees */}
                <section className="bg-background border border-text/5 rounded-[3rem] p-10 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-sm font-black text-text uppercase tracking-widest flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                                <Users className="w-4 h-4" />
                            </div>
                            Impact Leaders
                        </h3>
                        <p className="text-[10px] font-black text-text/20 uppercase tracking-widest">Tasks Assigned</p>
                    </div>
                    <div className="space-y-4">
                        {impact.top_assignees.map((a, i) => (
                            <div key={i} className="flex items-center justify-between p-5 bg-text/3 border border-text/5 rounded-2xl hover:bg-text/5 transition-colors group/leader">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-text text-background flex items-center justify-center text-[10px] font-black">
                                        {i + 1}
                                    </div>
                                    <span className="text-sm font-black text-text group-hover/leader:text-accent transition-colors">{a.assignee || "Global Agent"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-black tabular-nums text-text">{a.task_count}</span>
                                    <div className="w-20 h-2 bg-text/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-accent" style={{ width: `${(a.task_count / impact.top_assignees[0].task_count) * 100}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* Meetings Table (Full width) */}
            <section className="bg-background border border-text/5 rounded-[3.5rem] overflow-hidden shadow-xl shadow-text/2">
                <div className="px-10 py-6 border-b border-text/5 flex items-center justify-between">
                    <h3 className="text-sm font-black text-text uppercase tracking-widest flex items-center gap-3">
                        <div className="w-8 h-8 bg-text/5 rounded-xl flex items-center justify-center text-text/40">
                            <Calendar className="w-4 h-4" />
                        </div>
                        Meeting Velocity
                    </h3>
                    <p className="text-[10px] font-black text-text/20 uppercase tracking-widest">Last 12 Weeks</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-text/1">
                                <th className="px-10 py-4 text-left text-[10px] font-black text-text/30 uppercase tracking-[0.2em]">Week Period</th>
                                <th className="px-10 py-4 text-right text-[10px] font-black text-text/30 uppercase tracking-[0.2em]">Meeting Density</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-text/5">
                            {impact.meetings_per_week.map((row, i) => (
                                <tr key={i} className="hover:bg-text/2 transition-colors">
                                    <td className="px-10 py-5 text-sm font-black text-text/60">{row.week_start}</td>
                                    <td className="px-10 py-5 text-right">
                                        <div className="inline-flex items-center gap-3">
                                            <span className="text-sm font-black tabular-nums">{row.count}</span>
                                            <div className="flex gap-1">
                                                {Array.from({ length: 5 }).map((_, idx) => (
                                                    <div key={idx} className={`w-3 h-3 rounded-full ${idx < row.count ? 'bg-accent shadow-[0_0_8px_rgba(66,174,68,0.4)]' : 'bg-text/5'}`} />
                                                ))}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
