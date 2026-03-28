"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ScenarioConfig, buildSystemPrompt } from "@/lib/claude";
import { speak } from "@/lib/elevenlabs";
import {
    loadModels,
    detectExpression,
    expressionToEmoji,
    expressionToLabel,
    ExpressionLog,
} from "@/lib/faceapi";

interface Message {
    role: "user" | "assistant";
    content: string;
}

export default function RehearsalPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const expressionInterval = useRef<NodeJS.Timeout | null>(null);
    const recognitionRef = useRef<any>(null);
    const fillerLog = useRef<string[]>([]);
    const fullTranscriptRef = useRef<string>("");

    const [scenario, setScenario] = useState<ScenarioConfig | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [expressionLog, setExpressionLog] = useState<ExpressionLog[]>([]);
    const [currentExpression, setCurrentExpression] = useState<{
        expression: string;
        confidence: number;
    } | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [sessionStarted, setSessionStarted] = useState(false);

    // Load scenario from sessionStorage
    useEffect(() => {
        const stored = sessionStorage.getItem("candour_scenario");
        if (!stored) {
            router.push("/setup");
            return;
        }
        setScenario(JSON.parse(stored));
    }, [router]);

    // Init camera and face api
    async function initCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setCameraReady(true);
            }
            await loadModels();
        } catch (e) {
            console.error("Camera/model error:", e);
            setCameraError(true);
        }
    }

    // Start expression sampling once camera is ready
    useEffect(() => {
        if (!cameraReady) return;
        expressionInterval.current = setInterval(async () => {
            if (!videoRef.current) return;
            const result = await detectExpression(videoRef.current);
            if (result) {
                setCurrentExpression(result);
                setExpressionLog((prev) => [
                    ...prev,
                    { timestamp: Date.now(), ...result },
                ]);
            }
        }, 3000);
        return () => {
            if (expressionInterval.current) clearInterval(expressionInterval.current);
        };
    }, [cameraReady]);

    // Auto scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Start the session.  Get Claude's opening line
    const startSession = useCallback(async () => {
        if (!scenario || sessionStarted) return;
        console.log("Starting session with scenario:", scenario);
        setSessionStarted(true);
        setIsThinking(true);

        try {
            const systemPrompt = buildSystemPrompt(scenario);
            console.log("Calling /api/chat...");
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", content: "Begin." }],
                    systemPrompt,
                }),
            });
            console.log("Response status:", response.status);
            const data = await response.json();
            console.log("Response data:", data);

            if (data.error) {
                console.error("API error:", data.error);
                setIsThinking(false);
                return;
            }

            const aiMessage: Message = { role: "assistant", content: data.message };
            setMessages([aiMessage]);
            setIsThinking(false);
            setIsSpeaking(true);
            await speak(data.message);
            setIsSpeaking(false);
        } catch (e) {
            console.error("startSession failed:", e);
            setIsThinking(false);
        }
    }, [scenario, sessionStarted]);

    useEffect(() => {
        if (scenario) startSession();
    }, [scenario, startSession]);


    useEffect(() => {
        initCamera();
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Send a message to Claude
    async function sendMessage(content: string) {
        if (!scenario || !content.trim()) return;
        const userMessage: Message = { role: "user", content };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setIsThinking(true);

        const systemPrompt = buildSystemPrompt(scenario);
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: updatedMessages, systemPrompt }),
        });
        const data = await response.json();
        const aiMessage: Message = { role: "assistant", content: data.message };
        setMessages((prev) => [...prev, aiMessage]);
        setIsThinking(false);
        setIsSpeaking(true);
        await speak(data.message);
        setIsSpeaking(false);
    }

    // Voice input

    const fillerWords = [
        "um", "umm", "ummm",
        "uh", "uhh",
        "hmm", "hmmm",
        "mm", "mmm",
        "oh",
        "like", "you know", "sort of", "kind of", "basically", "literally"
    ];

    function startListening() {
        const SpeechRecognition =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;        // keeps going through pauses
        recognition.interimResults = true;
        recognition.lang = "en-US";

        fullTranscriptRef.current = "";
        fillerLog.current = [];

        recognition.onstart = () => setIsListening(true);

        recognition.onresult = (e: any) => {
            let interim = "";
            let final = "";

            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript;
                if (e.results[i].isFinal) {
                    final += t;
                    // Notice we removed the filler checking from here!
                } else {
                    interim += t;
                }
            }

            if (final) fullTranscriptRef.current += " " + final;
            setTranscript((fullTranscriptRef.current + " " + interim).trim());
        };

        recognition.onerror = (e: any) => {
            // Ignore no-speech errors — these happen on pauses, not real errors
            if (e.error !== "no-speech") {
                console.error("Speech recognition error:", e.error);
                setIsListening(false);
            }
        };

        recognition.start();
    }

    function stopListening() {
        recognitionRef.current?.stop();
        setIsListening(false);

        const finalText = fullTranscriptRef.current.trim();

        if (finalText) {

            const currentFillers: string[] = [];
            fillerWords.forEach((filler) => {
                const regex = new RegExp(`\\b${filler}\\b`, "gi");
                const matches = finalText.match(regex);
                if (matches) currentFillers.push(...matches);
            });


            const existingFillers = JSON.parse(sessionStorage.getItem("candour_fillers") || "[]");
            sessionStorage.setItem("candour_fillers", JSON.stringify([...existingFillers, ...currentFillers]));

            setTranscript("");
            fullTranscriptRef.current = "";
            sendMessage(finalText);
        }
    }

    // Break character
    async function breakCharacter() {
        await sendMessage("Break character — give me one quick coaching tip on how I'm doing so far.");
    }

    // End session
    function endSession() {
        sessionStorage.setItem("candour_transcript", JSON.stringify(messages));
        sessionStorage.setItem("candour_expressions", JSON.stringify(expressionLog));
        router.push("/debrief");
    }

    if (!scenario) return null;

    return (
        <main
            style={{ background: "#141414", color: "white", height: "100vh" }}
            className="flex flex-col"
        >
            <a href="#chat-input" className="skip-link">Skip to chat input</a>

            {/* Nav */}
            <nav
                aria-label="Rehearsal controls"
                style={{
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    padding: "1rem 1.5rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexShrink: 0,
                }}
            >
                <span
                    style={{
                        fontFamily: "var(--font-display)",
                        color: "#fbbf24",
                        fontSize: "1.25rem",
                    }}
                >
                    Candour
                </span>

                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem" }}>
                    Rehearsing with:{" "}
                    <strong style={{ color: "white" }}>{scenario.personRole}</strong>
                </span>

                <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button
                        onClick={breakCharacter}
                        disabled={isThinking || isSpeaking}
                        aria-label="Break character and get a coaching tip"
                        style={{
                            background: "rgba(255,255,255,0.07)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: "rgba(255,255,255,0.8)",
                            padding: "8px 16px",
                            borderRadius: "999px",
                            fontSize: "0.875rem",
                            cursor: "pointer",
                            opacity: isThinking || isSpeaking ? 0.4 : 1,
                        }}
                    >
                        💡 Coaching tip
                    </button>
                    <button
                        onClick={endSession}
                        aria-label="End rehearsal session and get debrief"
                        style={{
                            background: "#fbbf24",
                            border: "none",
                            color: "#000",
                            fontWeight: 700,
                            padding: "8px 16px",
                            borderRadius: "999px",
                            fontSize: "0.875rem",
                            cursor: "pointer",
                        }}
                    >
                        End Session →
                    </button>
                </div>
            </nav>

            {/* Main layout */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

                {/* Chat */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

                    {/* Messages */}
                    <div
                        role="log"
                        aria-live="polite"
                        aria-label="Conversation"
                        style={{
                            flex: 1,
                            overflowY: "auto",
                            padding: "2rem 1.5rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "1.25rem",
                        }}
                    >
                        {messages.length === 0 && (
                            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", marginTop: "4rem" }}>
                                {isThinking ? "Starting your session..." : ""}
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                style={{
                                    display: "flex",
                                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                                }}
                            >
                                <div
                                    style={{
                                        maxWidth: "70%",
                                        padding: "12px 16px",
                                        borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                                        background: msg.role === "user" ? "#fbbf24" : "rgba(255,255,255,0.07)",
                                        color: msg.role === "user" ? "#000" : "white",
                                        fontSize: "1rem",
                                        lineHeight: 1.6,
                                    }}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        {isThinking && (
                            <div style={{ display: "flex", justifyContent: "flex-start" }}>
                                <div
                                    aria-label="AI is thinking"
                                    style={{
                                        padding: "12px 20px",
                                        borderRadius: "18px 18px 18px 4px",
                                        background: "rgba(255,255,255,0.07)",
                                        color: "rgba(255,255,255,0.5)",
                                        fontSize: "1rem",
                                    }}
                                >
                                    ···
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Voice input */}
                    <div
                        id="chat-input"
                        style={{
                            padding: "1.25rem 1.5rem",
                            borderTop: "1px solid rgba(255,255,255,0.05)",
                            display: "flex",
                            alignItems: "center",
                            gap: "1rem",
                            flexShrink: 0,
                        }}
                    >
                        {transcript && (
                            <div style={{
                                flex: 1,
                                color: "rgba(255,255,255,0.5)",
                                fontSize: "0.9375rem",
                                fontStyle: "italic",
                            }}>
                                "{transcript}"
                            </div>
                        )}

                        {!transcript && (
                            <div style={{ flex: 1, color: "rgba(255,255,255,0.25)", fontSize: "0.9375rem" }}>
                                {isListening ? "Listening..." : isSpeaking ? "Speaking..." : "Press and hold to speak"}
                            </div>
                        )}

                        <button
                            onMouseDown={startListening}
                            onMouseUp={stopListening}
                            onTouchStart={startListening}
                            onTouchEnd={stopListening}
                            disabled={isThinking || isSpeaking}
                            aria-label={isListening ? "Release to send" : "Hold to speak"}
                            aria-pressed={isListening}
                            style={{
                                width: "64px",
                                height: "64px",
                                borderRadius: "50%",
                                border: "none",
                                background: isListening ? "#ef4444" : "#fbbf24",
                                cursor: isThinking || isSpeaking ? "not-allowed" : "pointer",
                                opacity: isThinking || isSpeaking ? 0.4 : 1,
                                fontSize: "1.5rem",
                                transition: "all 0.15s",
                                flexShrink: 0,
                                boxShadow: isListening ? "0 0 0 8px rgba(239,68,68,0.2)" : "none",
                            }}
                        >
                            {isListening ? "⏹" : "🎤"}
                        </button>
                    </div>
                </div>

                {/* Right sidebar — camera + expression */}
                <div
                    aria-label="Expression tracking panel"
                    style={{
                        width: "240px",
                        borderLeft: "1px solid rgba(255,255,255,0.05)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                        padding: "1.25rem",
                        flexShrink: 0,
                    }}
                >
                    {/* Camera */}
                    <div style={{ position: "relative" }}>
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            aria-label="Your camera feed"
                            style={{
                                width: "100%",
                                borderRadius: "12px",
                                background: "#000",
                                aspectRatio: "4/3",
                                objectFit: "cover",
                                display: cameraError ? "none" : "block",
                            }}
                        />
                        {cameraError && (
                            <div
                                role="alert"
                                style={{
                                    background: "rgba(255,255,255,0.05)",
                                    borderRadius: "12px",
                                    aspectRatio: "4/3",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "rgba(255,255,255,0.4)",
                                    fontSize: "0.875rem",
                                    textAlign: "center",
                                    padding: "1rem",
                                }}
                            >
                                Camera unavailable — expression tracking disabled
                            </div>
                        )}
                    </div>

                    {/* Expression indicator */}
                    {currentExpression && (
                        <div
                            aria-live="polite"
                            aria-label={`Current expression: ${expressionToLabel(currentExpression.expression)}`}
                            style={{
                                background: "rgba(255,255,255,0.05)",
                                borderRadius: "10px",
                                padding: "12px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px",
                            }}
                        >
                            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>
                                YOU LOOK
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span aria-hidden="true" style={{ fontSize: "1.5rem" }}>
                                    {expressionToEmoji(currentExpression.expression)}
                                </span>
                                <span style={{ fontWeight: 600, fontSize: "1rem", color: "#fbbf24" }}>
                                    {expressionToLabel(currentExpression.expression)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Tips */}
                    <div style={{ marginTop: "auto" }}>
                        <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
                            Hold the mic button to speak. Say "break character" or use the button above for a coaching tip.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}