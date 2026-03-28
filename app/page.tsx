import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{ background: "#0e0e0e", color: "white", minHeight: "100vh" }}
      className="flex flex-col"
    >
      {/* Nav */}
      <nav className="px-8 py-6 flex items-center justify-between border-b border-white/5">
        <span
          style={{
            fontFamily: "var(--font-display)",
            color: "#fbbf24",
            fontSize: "1.25rem",
            letterSpacing: "0.05em",
          }}
        >
          Candour
        </span>
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.7rem", letterSpacing: "0.2em" }}>
          AI COMMUNICATION COACH
        </span>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 text-center py-24 relative">
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "rgba(251,191,36,0.07)",
            filter: "blur(100px)",
            pointerEvents: "none",
          }}
        />

        <div className="relative flex flex-col items-center gap-6 max-w-2xl">
          {/* Badge */}
          <span
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.25em",
              color: "#fbbf24",
              border: "1px solid rgba(251,191,36,0.2)",
              padding: "6px 16px",
              borderRadius: "999px",
            }}
          >
            REHEARSE · REFLECT · IMPROVE
          </span>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(3rem, 8vw, 5.5rem)",
              lineHeight: 1.05,
              fontWeight: 700,
            }}
          >
            Say it better,{" "}
            <span style={{ color: "#fbbf24", fontStyle: "italic" }}>
              every time.
            </span>
          </h1>

          {/* Subtext */}
          <p
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: "1.1rem",
              lineHeight: 1.7,
              maxWidth: "480px",
            }}
          >
            Rehearse difficult conversations with an AI that plays the other
            person — then get honest feedback on what you said and how you
            looked saying it.
          </p>

          {/* CTA */}
          <Link
            href="/setup"
            style={{
              marginTop: "1rem",
              background: "#fbbf24",
              color: "#000",
              fontWeight: 600,
              padding: "14px 36px",
              borderRadius: "999px",
              fontSize: "0.9rem",
              letterSpacing: "0.05em",
              textDecoration: "none",
              transition: "background 0.2s",
            }}
          >
            Start Rehearsing →
          </Link>
        </div>
      </section>

      {/* Feature strip */}
      <section
        style={{ borderTop: "1px solid rgba(255,255,255,0.075)" }}
        className="px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-10 max-w-5xl mx-auto w-full"
      >
        {[
          {
            icon: "🎭",
            title: "Roleplay Engine",
            desc: "AI steps into the role of whoever you're nervous about facing — boss, doctor, landlord, parent.",
          },
          {
            icon: "👁️",
            title: "Expression Tracking",
            desc: "Your camera reads your face in real time — so you know if you look as confident as you feel.",
          },
          {
            icon: "📋",
            title: "Honest Debrief",
            desc: "After each session, get specific feedback on your words, your patterns, and your presence.",
          },
        ].map((f) => (
          <div key={f.title} className="flex flex-col gap-3">
            <span style={{ fontSize: "1.8rem" }}>{f.icon}</span>
            <span
              style={{
                color: "#fbbf24",
                fontWeight: 600,
                fontSize: "0.9rem",
                letterSpacing: "0.05em",
              }}
            >
              {f.title}
            </span>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.875rem", lineHeight: 1.7 }}>
              {f.desc}
            </p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          color: "rgba(255,255,255,0.2)",
          fontSize: "0.75rem",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        Built for ISAZI AI for Accessibility Hackathon
      </footer>
    </main>
  );
}