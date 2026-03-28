"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ScenarioConfig } from "@/lib/claude";

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

export default function SetupPage() {
    const router = useRouter();
    const [scenario, setScenario] = useState<ScenarioConfig>({
        userName: "",
        situation: "",
        personRole: "",
        personPersonality: "",
        userGoal: "",
    });
    const [activePreset, setActivePreset] = useState<number | null>(null);
    const [errors, setErrors] = useState<Partial<ScenarioConfig>>({});

    function applyPreset(index: number) {
        setActivePreset(index);
        setScenario((prev) => ({
            ...PRESETS[index],
            userName: prev.userName,
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
                    aria-label="Candour - Back to home"
                >
                    Candour
                </Link>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem" }}>
                    Step 1 of 2 — Setup
                </span>
            </nav>

            <div id="main-content" className="flex-1 max-w-2xl mx-auto w-full px-6 py-12 flex flex-col gap-10">
                {/* Header */}
                <div className="flex flex-col gap-3">
                    <h1
                        style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "clamp(2rem, 5vw, 3rem)",
                            lineHeight: 1.1,
                            fontWeight: 700,
                        }}
                    >
                        Set the{" "}
                        <span style={{ color: "#fbbf24", fontStyle: "italic" }}>scene.</span>
                    </h1>
                    <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "1rem", lineHeight: 1.7 }}>
                        Tell us about the conversation you want to rehearse. The more detail you give, the more realistic the practice.
                    </p>
                </div>

                {/* Presets */}
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

                {/* Divider */}
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
                    <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem" }}>or customise</span>
                    <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
                </div>

                {/* Form */}
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
                    className="flex flex-col gap-6"
                    noValidate
                    aria-label="Scenario setup form"
                >
                    {/* Name */}
                    <div>
                        <label htmlFor="userName" style={labelStyle}>
                            Your name
                        </label>
                        <input
                            id="userName"
                            type="text"
                            placeholder="What should the AI call you?"
                            value={scenario.userName}
                            onChange={(e) => setScenario((p) => ({ ...p, userName: e.target.value }))}
                            aria-describedby={errors.userName ? "userName-error" : undefined}
                            aria-invalid={!!errors.userName}
                            style={{
                                ...inputStyle,
                                borderColor: errors.userName ? "#ef4444" : "rgba(255,255,255,0.1)",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "#fbbf24")}
                            onBlur={(e) => (e.target.style.borderColor = errors.userName ? "#ef4444" : "rgba(255,255,255,0.1)")}
                        />
                        {errors.userName && (
                            <span id="userName-error" role="alert" style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "6px", display: "block" }}>
                                {errors.userName}
                            </span>
                        )}
                    </div>

                    {/* Situation */}
                    <div>
                        <label htmlFor="situation" style={labelStyle}>
                            What is the situation?
                        </label>
                        <textarea
                            id="situation"
                            rows={3}
                            placeholder="e.g. I need to ask my landlord to fix the heating before winter."
                            value={scenario.situation}
                            onChange={(e) => setScenario((p) => ({ ...p, situation: e.target.value }))}
                            aria-describedby={errors.situation ? "situation-error" : undefined}
                            aria-invalid={!!errors.situation}
                            style={{
                                ...inputStyle,
                                resize: "vertical",
                                borderColor: errors.situation ? "#ef4444" : "rgba(255,255,255,0.1)",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "#fbbf24")}
                            onBlur={(e) => (e.target.style.borderColor = errors.situation ? "#ef4444" : "rgba(255,255,255,0.1)")}
                        />
                        {errors.situation && (
                            <span id="situation-error" role="alert" style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "6px", display: "block" }}>
                                {errors.situation}
                            </span>
                        )}
                    </div>

                    {/* Person role */}
                    <div>
                        <label htmlFor="personRole" style={labelStyle}>
                            Who are you talking to?
                        </label>
                        <input
                            id="personRole"
                            type="text"
                            placeholder="e.g. My landlord, My manager, My GP"
                            value={scenario.personRole}
                            onChange={(e) => setScenario((p) => ({ ...p, personRole: e.target.value }))}
                            aria-describedby={errors.personRole ? "personRole-error" : undefined}
                            aria-invalid={!!errors.personRole}
                            style={{
                                ...inputStyle,
                                borderColor: errors.personRole ? "#ef4444" : "rgba(255,255,255,0.1)",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "#fbbf24")}
                            onBlur={(e) => (e.target.style.borderColor = errors.personRole ? "#ef4444" : "rgba(255,255,255,0.1)")}
                        />
                        {errors.personRole && (
                            <span id="personRole-error" role="alert" style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "6px", display: "block" }}>
                                {errors.personRole}
                            </span>
                        )}
                    </div>

                    {/* Personality */}
                    <div>
                        <label htmlFor="personPersonality" style={labelStyle}>
                            How would you describe them? <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 400 }}>(optional)</span>
                        </label>
                        <input
                            id="personPersonality"
                            type="text"
                            placeholder="e.g. Impatient, tends to dismiss concerns quickly"
                            value={scenario.personPersonality}
                            onChange={(e) => setScenario((p) => ({ ...p, personPersonality: e.target.value }))}
                            style={inputStyle}
                            onFocus={(e) => (e.target.style.borderColor = "#fbbf24")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                        />
                    </div>

                    <div>
                        <label htmlFor="context" style={labelStyle}>
                            Any background context?{" "}
                            <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 400 }}>(optional)</span>
                        </label>
                        <textarea
                            id="context"
                            rows={3}
                            placeholder="e.g. I've already asked for a raise once before and was told to wait 6 months. It's now been 8 months."
                            value={scenario.context || ""}
                            onChange={(e) => setScenario((p) => ({ ...p, context: e.target.value }))}
                            style={{ ...inputStyle, resize: "vertical" }}
                            onFocus={(e) => (e.target.style.borderColor = "#fbbf24")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                        />
                    </div>

                    {/* Goal */}
                    <div>
                        <label htmlFor="userGoal" style={labelStyle}>
                            What does a good outcome look like?
                        </label>
                        <textarea
                            id="userGoal"
                            rows={2}
                            placeholder="e.g. Get a clear commitment on when repairs will be done."
                            value={scenario.userGoal}
                            onChange={(e) => setScenario((p) => ({ ...p, userGoal: e.target.value }))}
                            aria-describedby={errors.userGoal ? "userGoal-error" : undefined}
                            aria-invalid={!!errors.userGoal}
                            style={{
                                ...inputStyle,
                                resize: "vertical",
                                borderColor: errors.userGoal ? "#ef4444" : "rgba(255,255,255,0.1)",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "#fbbf24")}
                            onBlur={(e) => (e.target.style.borderColor = errors.userGoal ? "#ef4444" : "rgba(255,255,255,0.1)")}
                        />
                        {errors.userGoal && (
                            <span id="userGoal-error" role="alert" style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "6px", display: "block" }}>
                                {errors.userGoal}
                            </span>
                        )}
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
                            transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#fcd34d")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#fbbf24")}
                    >
                        Begin Rehearsal →
                    </button>
                </form>
            </div>
        </main>
    );
}