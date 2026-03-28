"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ScenarioConfig, buildDebriefPrompt } from "@/lib/claude";
import { ExpressionLog } from "@/lib/faceapi";

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
        // Try bold header first
        const boldRegex = new RegExp(
            `\\*\\*${key}\\*\\*[:\\s]*([\\s\\S]*?)(?=\\*\\*[A-Z]|$)`,
            "i"
        );
        // Try numbered header e.g. "1. Overall"
        const numberedRegex = new RegExp(
            `\\d+\\.\\s*\\*?\\*?${key}\\*?\\*?[:\\s]*([\\s\\S]*?)(?=\\d+\\.|\\*\\*[A-Z]|$)`,
            "i"
        );
        // Try plain header e.g. "Overall:" on its own line
        const plainRegex = new RegExp(
            `(?:^|\\n)${key}[:\\s]*([\\s\\S]*?)(?=\\n[A-Z]|\\*\\*|\\d+\\.|$)`,
            "i"
        );

        const match =
            text.match(boldRegex) ||
            text.match(numberedRegex) ||
            text.match(plainRegex);

        const content = match
            ? match[1]
                .replace(/^[-–]\s*/gm, "")
                .replace(/\*\*/g, "")
                .trim()
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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

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
        const expressions: ExpressionLog[] = storedExpressions
            ? JSON.parse(storedExpressions)
            : [];
        const fillerData: string[] = storedFillers
            ? JSON.parse(storedFillers)
            : [];

        setScenario(scenarioData);
        setFillers(fillerData);
        generateDebrief(scenarioData, transcript, expressions);
    }, [router]);

    async function generateDebrief(
        scenarioData: ScenarioConfig,
        transcript: Message[],
        expressions: ExpressionLog[]
    ) {
        try {
            const prompt = buildDebriefPrompt(transcript, expressions, scenarioData);
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", content: prompt }],
                    systemPrompt:
                        "You are a warm, specific, and honest communication coach. Always structure your response with these exact bold headers: **Overall**, **What worked**, **What to work on**, **Expression insights**, **One thing to practise**.",
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

    function fillerSummary() {
        if (fillers.length === 0) return null;
        const counts: Record<string, number> = {};
        fillers.forEach((f) => {
            counts[f.toLowerCase()] = (counts[f.toLowerCase()] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    }

    const topFillers = fillerSummary();

    return (
        <main
            style={{ background: "#141414", color: "white", minHeight: "100vh" }}
            className="flex flex-col"
        >
            <a href="#main-content" className="skip-link">
                Skip to main content
            </a>

            {/* Nav */}
            <nav
                aria-label="Main navigation"
                className="px-8 py-6 flex items-center justify-between"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
                <Link
                    href="/"
                    style={{
                        fontFamily: "var(--font-display)",
                        color: "#fbbf24",
                        fontSize: "1.25rem",
                        letterSpacing: "0.05em",
                        textDecoration: "none",
                    }}
                >
                    Candour
                </Link>
                <span
                    style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem" }}
                >
                    Your Debrief
                </span>
                <Link
                    href="/setup"
                    style={{
                        background: "#fbbf24",
                        color: "#000",
                        fontWeight: 700,
                        padding: "8px 20px",
                        borderRadius: "999px",
                        fontSize: "0.875rem",
                        textDecoration: "none",
                    }}
                >
                    Rehearse Again →
                </Link>
            </nav>

            <div
                id="main-content"
                className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 flex flex-col gap-8"
            >
                {/* Header */}
                {scenario && (
                    <div className="flex flex-col gap-2">
                        <h1
                            style={{
                                fontFamily: "var(--font-display)",
                                fontSize: "clamp(2rem, 5vw, 3rem)",
                                lineHeight: 1.1,
                                fontWeight: 700,
                            }}
                        >
                            How did it{" "}
                            <span style={{ color: "#fbbf24", fontStyle: "italic" }}>
                                go?
                            </span>
                        </h1>
                        <p
                            style={{
                                color: "rgba(255,255,255,0.6)",
                                fontSize: "1rem",
                                lineHeight: 1.7,
                            }}
                        >
                            You rehearsed:{" "}
                            <strong style={{ color: "white" }}>{scenario.situation}</strong>
                        </p>
                    </div>
                )}

                {/* Loading state */}
                {isLoading && (
                    <div
                        role="status"
                        aria-live="polite"
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "1rem",
                            alignItems: "center",
                            padding: "4rem 0",
                            color: "rgba(255,255,255,0.5)",
                        }}
                    >
                        <div
                            aria-hidden="true"
                            style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                border: "3px solid rgba(255,255,255,0.1)",
                                borderTop: "3px solid #fbbf24",
                                animation: "spin 1s linear infinite",
                            }}
                        />
                        <p style={{ fontSize: "1rem" }}>
                            Analysing your session...
                        </p>
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div
                        role="alert"
                        style={{
                            background: "rgba(239,68,68,0.1)",
                            border: "1px solid rgba(239,68,68,0.3)",
                            borderRadius: "12px",
                            padding: "1.5rem",
                            color: "#ef4444",
                            fontSize: "1rem",
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* Filler words */}
                {!isLoading && topFillers && topFillers.length > 0 && (
                    <section
                        aria-labelledby="fillers-heading"
                        style={{
                            background: "rgba(251,191,36,0.06)",
                            border: "1px solid rgba(251,191,36,0.15)",
                            borderRadius: "16px",
                            padding: "1.5rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "1rem",
                            animation: "fadeSlideUp 0.4s ease forwards",
                            opacity: 0.01,
                        }}
                    >
                        <h2
                            id="fillers-heading"
                            style={{
                                fontSize: "1rem",
                                fontWeight: 600,
                                color: "#fbbf24",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                            }}
                        >
                            <span aria-hidden="true">🗣️</span> Filler words detected
                        </h2>
                        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                            {topFillers.map(([word, count]) => (
                                <div
                                    key={word}
                                    style={{
                                        background: "rgba(255,255,255,0.07)",
                                        borderRadius: "999px",
                                        padding: "6px 14px",
                                        fontSize: "0.9375rem",
                                        color: "white",
                                        display: "flex",
                                        gap: "0.5rem",
                                        alignItems: "center",

                                    }}
                                >
                                    <span>"{word}"</span>
                                    <span
                                        style={{
                                            background: "#fbbf24",
                                            color: "#000",
                                            borderRadius: "999px",
                                            padding: "2px 8px",
                                            fontSize: "0.8125rem",
                                            fontWeight: 700,
                                        }}
                                    >
                                        ×{count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Debrief sections */}
                {!isLoading && debrief.length > 0 && (
                    <div className="flex flex-col gap-5">
                        {debrief.map((section, index) => (
                            <section
                                key={section.title}
                                aria-labelledby={`section-${section.title.replace(/\s+/g, "-")}`}
                                style={{
                                    background: "rgba(255,255,255,0.04)",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    borderRadius: "16px",
                                    padding: "1.5rem",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.75rem",
                                    animation: "fadeSlideUp 0.4s ease forwards",
                                    animationDelay: `${0.1 + index * 0.1}s`,
                                    opacity: 0.01,
                                }}
                            >
                                <h2
                                    id={`section-${section.title.replace(/\s+/g, "-")}`}
                                    style={{
                                        fontSize: "1rem",
                                        fontWeight: 600,
                                        color: "#fbbf24",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                    }}
                                >
                                    <span aria-hidden="true">{section.emoji}</span>
                                    {section.title}
                                </h2>
                                <p
                                    style={{
                                        color: "rgba(255,255,255,0.85)",
                                        fontSize: "1rem",
                                        lineHeight: 1.75,
                                        whiteSpace: "pre-wrap",
                                    }}
                                >
                                    {section.content}
                                </p>
                            </section>
                        ))}
                    </div>
                )}

                {/* Fallback. Show raw if parsing failed */}
                {!isLoading && debrief.length === 0 && rawDebrief && (
                    <section
                        style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "16px",
                            padding: "1.5rem",
                        }}
                    >
                        <p
                            style={{
                                color: "rgba(255,255,255,0.85)",
                                fontSize: "1rem",
                                lineHeight: 1.75,
                                whiteSpace: "pre-wrap",
                            }}
                        >
                            {rawDebrief}
                        </p>
                    </section>
                )}

                {/* Rehearse again CTA */}
                {!isLoading && (
                    <div
                        style={{
                            display: "flex",
                            gap: "1rem",
                            paddingTop: "1rem",
                            flexWrap: "wrap",
                        }}
                    >
                        <Link
                            href="/setup"
                            style={{
                                background: "#fbbf24",
                                color: "#000",
                                fontWeight: 700,
                                padding: "14px 32px",
                                borderRadius: "999px",
                                fontSize: "1rem",
                                textDecoration: "none",
                            }}
                        >
                            Rehearse Again →
                        </Link>
                        <Link
                            href="/"
                            style={{
                                background: "rgba(255,255,255,0.07)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                color: "white",
                                fontWeight: 600,
                                padding: "14px 32px",
                                borderRadius: "999px",
                                fontSize: "1rem",
                                textDecoration: "none",
                            }}
                        >
                            Back to Home
                        </Link>
                    </div>
                )}
            </div>

            {/* Spinner animation */}
            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>


            <style>{`
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
`}</style>
        </main>
    );
}