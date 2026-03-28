"use client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ExpressionLog } from "@/lib/hume";

export default function EmotionalArcChart({ expressions, type }: { expressions: ExpressionLog[], type: "face" | "voice" }) {
    const logs = expressions.filter(e => e.type === type);
    if (logs.length === 0) return <div className="py-10 text-center opacity-50">No data captured for this metric.</div>;

    //  Find the 3 most frequent emotions in this specific session
    const frequencyMap: Record<string, number> = {};
    logs.forEach(log => {
        const top = log.topEmotions[0]?.name;
        if (top) frequencyMap[top] = (frequencyMap[top] || 0) + 1;
    });

    const activeTraits = Object.entries(frequencyMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(entry => entry[0]);

    //  FORMATTING
    const chartData = logs.map((log) => {
        const relativeTimeMs = log.timestamp - logs[0].timestamp;
        const seconds = Math.floor(relativeTimeMs / 1000);
        const timeString = `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

        const dataPoint: any = { time: timeString };
        log.topEmotions.forEach(emo => {
            // Only map the scores for the traits we are actually graphing
            if (activeTraits.includes(emo.name)) {
                dataPoint[emo.name] = Math.round(emo.score * 100);
            }
        });
        return dataPoint;
    });

    const colors = ["#fbbf24", "#60a5fa", "#f87171"]; // Amber, Blue, Red

    return (
        <div style={{ width: '100%', height: 300, background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        {activeTraits.map((trait, i) => (
                            <linearGradient key={`grad-${trait}`} id={`color${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colors[i]} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={colors[i]} stopOpacity={0} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip
                        contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    />
                    {activeTraits.map((trait, i) => (
                        <Area
                            key={trait}
                            type="monotone"
                            dataKey={trait}
                            stroke={colors[i]}
                            fillOpacity={1}
                            fill={`url(#color${i})`}
                            strokeWidth={2}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}