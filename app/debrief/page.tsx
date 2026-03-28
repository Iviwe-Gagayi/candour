"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ScenarioConfig, buildDebriefPrompt } from "@/lib/claude";
import { ExpressionLog } from "@/lib/hume";
import EmotionalArcChart from "@/app/components/EmotionalArcChart";

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface DebriefSection {
    title: string;
    content: string;
    emoji: string;
}

function parseDebrief(text: string): DebriefSection[] {
    const sections = [
        { key: "Overall", emoji: "🎯" },
        { key: "What worked", emoji: "✅" },
        { key: "What to work on", emoji: "🔧" },
        { key: "Expression insights", emoji: "👁️" },
        { key: "One thing to practise", emoji: "⭐" },
    ];

    return sections.map(({ key, emoji }) => {
        const boldRegex = new RegExp(`\\*\\*${key}\\*\\*[:\\s]*([\\s\\S]*?)(?=\\*\\*[A-Z]|$)`, "i");
        const numberedRegex = new RegExp(`\\d+\\.\\s*\\*?\\*?${key}\\*?\\*?[:\\s]*([\\s\\S]*?)(?=\\d+\\.|\\*\\*[A-Z]|$)`, "i");
        const plainRegex = new RegExp(`(?:^|\\n)${key}[:\\s]*([\\s\\S]*?)(?=\\n[A-Z]|\\*\\*|\\d+\\.|$)`, "i");

        const match = text.match(boldRegex) || text.match(numberedRegex) || text.match(plainRegex);

        const content = match
            ? match[1].replace(/^[-–]\s*/gm, "").replace(/\*\*/g, "").trim()
            : "";

        return { title: key, emoji, content };
    }).filter((s) => s.content && s.content !== "—" && s.content.length > 2);
}

export default function DebriefPage() {
    const router = useRouter();
    const [scenario, setScenario] = useState<ScenarioConfig | null>(null);
    const [debrief, setDebrief] = useState<DebriefSection[]>([]);
    const [rawDebrief, setRawDebrief] = useState("");
    const [fillers, setFillers] = useState<string[]>([]);
    const [expressions, setExpressions] = useState<ExpressionLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [showDeepDive, setShowDeepDive] = useState(false);

    useEffect(() => {
        const storedScenario = sessionStorage.getItem("candour_scenario");
        const storedTranscript = sessionStorage.getItem("candour_transcript");
        const storedExpressions = sessionStorage.getItem("candour_expressions");
        const storedFillers = sessionStorage.getItem("candour_fillers");

        if (!storedScenario || !storedTranscript) {
            router.push("/setup");
            return;
        }

        const scenarioData: ScenarioConfig = JSON.parse(storedScenario);
        const transcript: Message[] = JSON.parse(storedTranscript);
        const expData: ExpressionLog[] = storedExpressions ? JSON.parse(storedExpressions) : [];
        const fillerData: string[] = storedFillers ? JSON.parse(storedFillers) : [];

        setScenario(scenarioData);
        setFillers(fillerData);
        setExpressions(expData);
        generateDebrief(scenarioData, transcript, expData);
    }, [router]);

    async function generateDebrief(scenarioData: ScenarioConfig, transcript: Message[], expData: ExpressionLog[]) {
        try {
            const prompt = buildDebriefPrompt(transcript, expData, scenarioData);
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", content: prompt }],
                    systemPrompt: "You are a warm, highly literal, and specific communication coach. You excel at translating ambiguous social data into explicit, actionable feedback. Always structure your response with exact bold headers: **Overall**, **What worked**, **What to work on**, **Expression insights**, **One thing to practise**.",
                }),
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            setRawDebrief(data.message);
            setDebrief(parseDebrief(data.message));
        } catch (e) {
            setError("Failed to generate debrief. Please try again.");
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }

    // --- Analytics Helpers ---
    function getTopFillers() {
        if (fillers.length === 0) return null;
        const counts: Record<string, number> = {};
        fillers.forEach((f) => counts[f.toLowerCase()] = (counts[f.toLowerCase()] || 0) + 1);
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    }

    function getDominantBehavior(type: "face" | "voice") {
        const logs = expressions.filter(e => e.type === type);
        if (logs.length === 0) return null;
        const counts: Record<string, number> = {};
        logs.forEach(log => {
            if (log.topEmotions[0]) {
                const name = log.topEmotions[0].name;
                counts[name] = (counts[name] || 0) + 1;
            }
        });
        const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        const percentage = Math.round((dominant[1] / logs.length) * 100);
        return { name: dominant[0], percentage };
    }

    const topFillers = getTopFillers();
    const dominantFace = getDominantBehavior("face");
    const dominantVoice = getDominantBehavior("voice");

    return (
        <main style={{ background: "#141414", color: "white", minHeight: "100vh" }} className="flex flex-col">
            <a href="#main-content" className="skip-link">Skip to main content</a>

            {/* Nav */}
            <nav aria-label="Main navigation" className="px-8 py-6 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <Link href="/" style={{ fontFamily: "var(--font-display)", color: "#fbbf24", fontSize: "1.25rem", letterSpacing: "0.05em", textDecoration: "none" }}>
                    Candour
                </Link>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem" }}>Your Debrief</span>
                <Link href="/setup" style={{ background: "#fbbf24", color: "#000", fontWeight: 700, padding: "8px 20px", borderRadius: "999px", fontSize: "0.875rem", textDecoration: "none" }}>
                    Rehearse Again →
                </Link>
            </nav>

            <div id="main-content" className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col gap-10">
                {/* Header */}
                {scenario && (
                    <div className="flex flex-col gap-2">
                        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.1, fontWeight: 700 }}>
                            How did it <span style={{ color: "#fbbf24", fontStyle: "italic" }}>go?</span>
                        </h1>
                        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "1rem" }}>
                            Scenario: <strong style={{ color: "white" }}>{scenario.situation}</strong>
                        </p>
                    </div>
                )}

                {/* Loading state */}
                {isLoading && (
                    <div role="status" aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", padding: "4rem 0", color: "rgba(255,255,255,0.5)" }}>
                        <div aria-hidden="true" style={{ width: "40px", height: "40px", borderRadius: "50%", border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #fbbf24", animation: "spin 1s linear infinite" }} />
                        <p>Generating expert insights...</p>
                    </div>
                )}

                {/* Error state */}
                {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "12px", padding: "1.5rem", color: "#ef4444" }}>{error}</div>}

                {!isLoading && (
                    <>
                        {/* EXECUTIVE SUMMARY GRID */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', animation: "fadeSlideUp 0.4s ease forwards", opacity: 0 }}>
                            {dominantFace && (
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <h3 style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Dominant Face</h3>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fbbf24' }}>{dominantFace.name}</p>
                                    <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Active {dominantFace.percentage}% of the time</p>
                                </div>
                            )}
                            {dominantVoice && (
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <h3 style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Dominant Tone</h3>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#60a5fa' }}>{dominantVoice.name}</p>
                                    <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Found in {dominantVoice.percentage}% of session</p>
                                </div>
                            )}
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <h3 style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Filler Words</h3>
                                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f87171' }}>{fillers.length} Detected</p>
                                <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Top word: "{topFillers?.[0]?.[0] || 'None'}"</p>
                            </div>
                        </div>

                        {/* DETAILED ANALYTICS TOGGLE */}
                        <div style={{ animation: "fadeSlideUp 0.4s ease forwards", animationDelay: "0.1s", opacity: 0 }}>
                            <button
                                onClick={() => setShowDeepDive(!showDeepDive)}
                                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'white', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem' }}
                            >
                                {showDeepDive ? "Hide Data Graphs" : "Visualize Emotional Arc 📈"}
                            </button>
                            {showDeepDive && (
                                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2.5rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '20px' }}>
                                    <div>
                                        <h4 style={{ color: '#fbbf24', fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>Non-Verbal Timeline</h4>
                                        <EmotionalArcChart expressions={expressions} type="face" />
                                    </div>
                                    <div>
                                        <h4 style={{ color: '#60a5fa', fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>Vocal Inflexion Timeline</h4>
                                        <EmotionalArcChart expressions={expressions} type="voice" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* CLAUDE FEEDBACK CARDS */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                            {debrief.map((section, index) => (
                                <section key={section.title} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "1.5rem", animation: "fadeSlideUp 0.4s ease forwards", animationDelay: `${0.2 + index * 0.1}s`, opacity: 0 }}>
                                    <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#fbbf24", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: '0.75rem' }}>
                                        <span aria-hidden="true">{section.emoji}</span> {section.title}
                                    </h2>
                                    <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "1rem", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{section.content}</p>
                                </section>
                            ))}
                        </div>

                        <div style={{ display: "flex", gap: "1rem", paddingTop: "2rem", flexWrap: "wrap" }}>
                            <Link href="/setup" style={{ background: "#fbbf24", color: "#000", fontWeight: 700, padding: "14px 32px", borderRadius: "999px", textDecoration: "none" }}>Rehearse Again →</Link>
                            <Link href="/" style={{ background: "rgba(255,255,255,0.07)", color: "white", padding: "14px 32px", borderRadius: "999px", textDecoration: "none" }}>Back to Home</Link>
                        </div>
                    </>
                )}
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeSlideUp { 
                    from { opacity: 0; transform: translateY(20px); } 
                    to { opacity: 1; transform: translateY(0); } 
                }
                .skip-link { position: absolute; top: -40px; left: 0; background: #fbbf24; color: black; padding: 8px; z-index: 100; transition: top 0.3s; }
                .skip-link:focus { top: 0; }
            `}</style>
        </main>
    );
}