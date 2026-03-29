"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ScenarioConfig } from "@/lib/claude";
import { extractTextFromFile, getFileType, truncateContext } from "@/lib/documentParser";

// Standard ElevenLabs Voices for the demo
const VOICES = [
    { id: "auto", label: "Auto (Let AI choose)" },
    { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah (Calm, Female)" },
    { id: "IKne3meq5aSn9XLyUdCD", label: "Charlie (Conversational, Male)" },
    { id: "pNInz6obpgDQGcFmaJgB", label: "Adam (Professional, Male)" }
];

const PRESETS: ScenarioConfig[] = [
    {
        userName: "",
        situation: "I have a performance review with my manager and want to ask for a raise.",
        personRole: "Direct line manager",
        personPersonality: "Professional, data-driven, and fair but not easily swayed without evidence.",
        userGoal: "Confidently make the case for a salary increase and handle pushback well.",
    },
    {
        userName: "",
        situation: "I need to tell my doctor about a mental health symptom I've been embarrassed to mention.",
        personRole: "General practitioner / family doctor",
        personPersonality: "Warm but clinical, asks direct questions, limited time per appointment.",
        userGoal: "Clearly explain my symptoms without downplaying them and ask for a referral.",
    },
    {
        userName: "",
        situation: "I need to confront my housemate about not paying their share of the rent on time.",
        personRole: "Housemate and casual friend",
        personPersonality: "Avoidant, tends to deflect with humour, dislikes confrontation.",
        userGoal: "Address the issue directly without damaging the friendship or backing down.",
    },
];

const inputStyle = {
    width: "100%",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    padding: "14px 16px",
    color: "white",
    fontSize: "1rem",
    lineHeight: 1.6,
    outline: "none",
    transition: "border-color 0.2s",
};

const labelStyle = {
    display: "block",
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "rgba(255,255,255,0.85)",
    marginBottom: "8px",
    letterSpacing: "0.03em",
};

// Extend the ScenarioConfig type locally to include voiceId
type ExtendedScenarioConfig = ScenarioConfig & { voiceId?: string };

export default function SetupPage() {
    const [documentTexts, setDocumentTexts] = useState<{ name: string, text: string }[]>([]);
    const [documentLoading, setDocumentLoading] = useState(false);
    const [documentError, setDocumentError] = useState("");

    const router = useRouter();
    const [scenario, setScenario] = useState<ExtendedScenarioConfig>({
        userName: "",
        situation: "",
        personRole: "",
        personPersonality: "",
        userGoal: "",
        voiceId: "auto", // Default to auto
    });
    const [activePreset, setActivePreset] = useState<number | null>(null);
    const [errors, setErrors] = useState<Partial<ScenarioConfig>>({});

    function applyPreset(index: number) {
        setActivePreset(index);
        setScenario((prev) => ({
            ...PRESETS[index],
            userName: prev.userName,
            voiceId: prev.voiceId || "auto"
        }));
        setErrors({});
    }

    function validate(): boolean {
        const newErrors: Partial<ScenarioConfig> = {};
        if (!scenario.userName.trim()) newErrors.userName = "Please enter your name";
        if (!scenario.situation.trim()) newErrors.situation = "Please describe the situation";
        if (!scenario.personRole.trim()) newErrors.personRole = "Please enter their role";
        if (!scenario.userGoal.trim()) newErrors.userGoal = "Please describe your goal";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    function handleSubmit() {
        if (!validate()) return;
        // Clear previous session data
        sessionStorage.removeItem("candour_transcript");
        sessionStorage.removeItem("candour_expressions");
        sessionStorage.removeItem("candour_fillers");
        sessionStorage.setItem("candour_scenario", JSON.stringify(scenario));
        router.push("/rehearsal");
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        setDocumentLoading(true);
        setDocumentError("");

        try {
            const newDocs: { name: string, text: string }[] = [];
            for (const file of files) {
                const type = getFileType(file);
                if (!type) {
                    setDocumentError(`Skipped ${file.name} — unsupported file type.`);
                    continue;
                }
                const text = await extractTextFromFile(file);
                newDocs.push({ name: file.name, text: truncateContext(text) });
            }

            setDocumentTexts((prev) => {
                const updated = [...prev, ...newDocs];
                const combined = updated.map(d => `Document: ${d.name}\n\n${d.text}`).join("\n\n---\n\n");
                const manualContext = scenario.context?.split("\n\n---\n\n").find(s => !s.startsWith("Document:"))?.trim() || "";
                setScenario((p) => ({ ...p, context: manualContext ? `${combined}\n\n---\n\n${manualContext}` : combined }));
                return updated;
            });
        } catch (e) {
            console.error("Document parse error:", e);
            setDocumentError("Failed to read a document. Please try again.");
        } finally {
            setDocumentLoading(false);
            e.target.value = "";
        }
    }

    return (
        <main style={{ background: "#141414", color: "white", minHeight: "100vh" }} className="flex flex-col">
            <a href="#main-content" className="skip-link">Skip to main content</a>

            <nav aria-label="Main navigation" className="px-8 py-6 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <Link href="/" style={{ fontFamily: "var(--font-display)", color: "#fbbf24", fontSize: "1.25rem", letterSpacing: "0.05em", textDecoration: "none" }}>
                    Candour
                </Link>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem" }}>Step 1 of 2 — Setup</span>
            </nav>

            <div id="main-content" className="flex-1 max-w-2xl mx-auto w-full px-6 py-12 flex flex-col gap-10">
                <div className="flex flex-col gap-3">
                    <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.1, fontWeight: 700 }}>
                        Set the <span style={{ color: "#fbbf24", fontStyle: "italic" }}>scene.</span>
                    </h1>
                    <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "1rem", lineHeight: 1.7 }}>
                        Tell us about the conversation you want to rehearse. The more detail you give, the more realistic the practice.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <span style={labelStyle}>Quick start: pick a scenario</span>
                    <div className="flex flex-col gap-2">
                        {PRESETS.map((preset, i) => (
                            <button
                                key={i}
                                onClick={() => applyPreset(i)}
                                aria-pressed={activePreset === i}
                                style={{
                                    textAlign: "left",
                                    background: activePreset === i ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.03)",
                                    border: `1px solid ${activePreset === i ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.08)"}`,
                                    borderRadius: "10px",
                                    padding: "12px 16px",
                                    color: activePreset === i ? "#fbbf24" : "rgba(255,255,255,0.85)",
                                    fontSize: "0.9375rem",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    lineHeight: 1.5,
                                }}
                            >
                                {preset.situation}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
                    <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem" }}>or customise</span>
                    <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="flex flex-col gap-6" noValidate>
                    {/* Name */}
                    <div>
                        <label htmlFor="userName" style={labelStyle}>Your name</label>
                        <input id="userName" type="text" placeholder="What should the AI call you?" value={scenario.userName} onChange={(e) => setScenario((p) => ({ ...p, userName: e.target.value }))} style={{ ...inputStyle, borderColor: errors.userName ? "#ef4444" : "rgba(255,255,255,0.1)" }} onFocus={(e) => (e.target.style.borderColor = "#fbbf24")} onBlur={(e) => (e.target.style.borderColor = errors.userName ? "#ef4444" : "rgba(255,255,255,0.1)")} />
                        {errors.userName && <span role="alert" style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "6px", display: "block" }}>{errors.userName}</span>}
                    </div>

                    {/* Situation */}
                    <div>
                        <label htmlFor="situation" style={labelStyle}>What is the situation?</label>
                        <textarea id="situation" rows={3} placeholder="e.g. I need to ask my landlord to fix the heating before winter." value={scenario.situation} onChange={(e) => setScenario((p) => ({ ...p, situation: e.target.value }))} style={{ ...inputStyle, resize: "vertical", borderColor: errors.situation ? "#ef4444" : "rgba(255,255,255,0.1)" }} onFocus={(e) => (e.target.style.borderColor = "#fbbf24")} onBlur={(e) => (e.target.style.borderColor = errors.situation ? "#ef4444" : "rgba(255,255,255,0.1)")} />
                        {errors.situation && <span role="alert" style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "6px", display: "block" }}>{errors.situation}</span>}
                    </div>

                    {/* Person role */}
                    <div>
                        <label htmlFor="personRole" style={labelStyle}>Who are you talking to?</label>
                        <input id="personRole" type="text" placeholder="e.g. My landlord, My manager, My GP" value={scenario.personRole} onChange={(e) => setScenario((p) => ({ ...p, personRole: e.target.value }))} style={{ ...inputStyle, borderColor: errors.personRole ? "#ef4444" : "rgba(255,255,255,0.1)" }} onFocus={(e) => (e.target.style.borderColor = "#fbbf24")} onBlur={(e) => (e.target.style.borderColor = errors.personRole ? "#ef4444" : "rgba(255,255,255,0.1)")} />
                        {errors.personRole && <span role="alert" style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "6px", display: "block" }}>{errors.personRole}</span>}
                    </div>

                    {/* Personality */}
                    <div>
                        <label htmlFor="personPersonality" style={labelStyle}>How would you describe them? <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 400 }}>(optional)</span></label>
                        <input id="personPersonality" type="text" placeholder="e.g. Impatient, tends to dismiss concerns quickly" value={scenario.personPersonality} onChange={(e) => setScenario((p) => ({ ...p, personPersonality: e.target.value }))} style={inputStyle} onFocus={(e) => (e.target.style.borderColor = "#fbbf24")} onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
                    </div>

                    {/* Context */}
                    <div>
                        <label style={labelStyle}>Any background context? <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 400 }}>(optional)</span></label>
                        <div style={{ border: "1px dashed rgba(255,255,255,0.15)", borderRadius: "12px", padding: "1.25rem", marginBottom: "0.75rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", background: "rgba(255,255,255,0.02)", cursor: "pointer", position: "relative" }} onDragOver={(e) => e.preventDefault()} onDrop={async (e) => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) { const syntheticEvent = { target: { files: [file] } } as any; await handleFileUpload(syntheticEvent); } }}>
                            <input type="file" id="document-upload" accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.csv" onChange={handleFileUpload} multiple style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} aria-label="Upload documents for context" />
                            {documentLoading ? <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9375rem" }}>Reading document...</p> : <> <span aria-hidden="true" style={{ fontSize: "2rem" }}>📎</span> <div style={{ textAlign: "center" }}> <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9375rem" }}>Drop files or click to upload</p> <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8125rem", marginTop: "4px" }}>PDF, Word, Excel, or text file — multiple allowed</p> </div> </>}
                        </div>
                        {documentTexts.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
                                {documentTexts.map((doc, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "10px 14px" }}>
                                        <span style={{ fontSize: "1.25rem" }}>📄</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ color: "#fbbf24", fontSize: "0.875rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</p>
                                            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>{doc.text.length.toLocaleString()} characters</p>
                                        </div>
                                        <button type="button" onClick={() => { setDocumentTexts((prev) => { const updated = prev.filter((_, idx) => idx !== i); const combined = updated.map(d => `Document: ${d.name}\n\n${d.text}`).join("\n\n---\n\n"); setScenario((p) => ({ ...p, context: combined })); return updated; }); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", borderRadius: "999px", padding: "3px 10px", fontSize: "0.8125rem", cursor: "pointer", flexShrink: 0 }}>Remove</button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {documentError && <span role="alert" style={{ color: "#ef4444", fontSize: "0.875rem", display: "block", marginBottom: "0.75rem" }}>{documentError}</span>}
                        <textarea id="context" rows={2} placeholder="Add any additional context here..." value={scenario.context?.split("\n\n---\n\n").filter(s => !s.startsWith("Document:")).join("") || ""} onChange={(e) => { const docText = documentTexts.map(d => `Document: ${d.name}\n\n${d.text}`).join("\n\n---\n\n"); setScenario((p) => ({ ...p, context: docText ? `${docText}\n\n---\n\n${e.target.value}` : e.target.value })); }} style={{ ...inputStyle, resize: "vertical" }} onFocus={(e) => (e.target.style.borderColor = "#fbbf24")} onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
                    </div>

                    {/* NEW: Voice Selection */}
                    <div>
                        <label style={labelStyle}>Partner's Voice</label>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            {VOICES.map((voice) => (
                                <button
                                    key={voice.id}
                                    type="button"
                                    onClick={() => setScenario(p => ({ ...p, voiceId: voice.id }))}
                                    style={{
                                        padding: "10px 16px",
                                        borderRadius: "10px",
                                        border: `1px solid ${scenario.voiceId === voice.id ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.08)"}`,
                                        background: scenario.voiceId === voice.id ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.03)",
                                        color: scenario.voiceId === voice.id ? "#fbbf24" : "rgba(255,255,255,0.6)",
                                        fontSize: "0.875rem",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                    }}
                                >
                                    {voice.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Goal */}
                    <div>
                        <label htmlFor="userGoal" style={labelStyle}>What does a good outcome look like?</label>
                        <textarea id="userGoal" rows={2} placeholder="e.g. Get a clear commitment on when repairs will be done." value={scenario.userGoal} onChange={(e) => setScenario((p) => ({ ...p, userGoal: e.target.value }))} style={{ ...inputStyle, resize: "vertical", borderColor: errors.userGoal ? "#ef4444" : "rgba(255,255,255,0.1)" }} onFocus={(e) => (e.target.style.borderColor = "#fbbf24")} onBlur={(e) => (e.target.style.borderColor = errors.userGoal ? "#ef4444" : "rgba(255,255,255,0.1)")} />
                        {errors.userGoal && <span role="alert" style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "6px", display: "block" }}>{errors.userGoal}</span>}
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        style={{
                            background: "#fbbf24",
                            color: "#000",
                            fontWeight: 700,
                            padding: "16px 40px",
                            borderRadius: "999px",
                            fontSize: "1rem",
                            letterSpacing: "0.05em",
                            border: "none",
                            cursor: "pointer",
                            alignSelf: "flex-start",
                            transition: "background 0.2s"
                        }}
                        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.background = "#fcd34d")}
                        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.background = "#fbbf24")}
                    >
                        Begin Rehearsal →
                    </button>
                </form>
            </div>
        </main>
    );
}