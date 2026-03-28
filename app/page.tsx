"use client";
import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{ background: "#141414", color: "white", minHeight: "100vh" }}
      className="flex flex-col"
    >
      {/* Skip navigation - screen reader / keyboard users */}

      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Nav */}
      <nav
        aria-label="Main navigation"
        className="px-8 py-6 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            color: "#fbbf24",
            fontSize: "1.25rem",
            letterSpacing: "0.05em",
          }}
          aria-label="Candour - AI Communication Coach"
        >
          Candour
        </span>
        <span
          aria-hidden="true"
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: "0.875rem",
            letterSpacing: "0.1em",
          }}
        >
          AI Communication Coach
        </span>
      </nav>

      {/* Hero */}
      <section
        id="main-content"
        aria-labelledby="hero-heading"
        className="flex-1 flex flex-col items-center justify-center px-6 text-center py-24 relative"
      >
        {/* Glow - decorative, hidden from screen readers */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "rgba(251,191,36,0.04)",
            filter: "blur(100px)",
            pointerEvents: "none",
          }}
        />

        <div className="relative flex flex-col items-center gap-6 max-w-2xl">
          {/* Badge */}
          <span
            aria-hidden="true"
            style={{
              fontSize: "0.875rem",
              letterSpacing: "0.15em",
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
            id="hero-heading"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.5rem, 8vw, 5.5rem)",
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
              color: "rgba(255,255,255,0.85)",
              fontSize: "1.125rem",
              lineHeight: 1.8,
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
              fontWeight: 700,
              padding: "16px 40px",
              borderRadius: "999px",
              fontSize: "1rem",
              letterSpacing: "0.05em",
              textDecoration: "none",
              display: "inline-block",
              outline: "none",
            }}
            aria-label="Start rehearsing a conversation"
          >
            Start Rehearsing →
          </Link>
        </div>

      </section>


      {/* Features */}
      <section
        aria-labelledby="features-heading"
        style={{ borderTop: "1px solid rgba(255,255,255,0.075)" }}
        className="px-8 py-12 max-w-5xl mx-auto w-full"
      >
        <h2
          id="features-heading"
          style={{
            fontSize: "0.875rem",
            color: "rgba(255,255,255,0.6)",
            letterSpacing: "0.15em",
            marginBottom: "2rem",
            textAlign: "center",
          }}
        >
          HOW IT WORKS
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            {
              icon: "🎭",
              title: "Roleplay Engine",
              desc: "AI steps into the role of whoever you are nervous about facing — boss, doctor, landlord, or parent.",
            },
            {
              icon: "👁️",
              title: "Expression Tracking",
              desc: "Your camera reads your face in real time so you know if you look as confident as you feel.",
            },
            {
              icon: "📋",
              title: "Honest Debrief",
              desc: "After each session, get specific feedback on your words, your patterns, and your presence.",
            },
          ].map((f) => (
            <article key={f.title} className="flex flex-col gap-3">
              <span
                aria-hidden="true"
                style={{ fontSize: "2rem" }}
              >
                {f.icon}
              </span>
              <h3
                style={{
                  color: "#fbbf24",
                  fontWeight: 600,
                  fontSize: "1rem",
                  letterSpacing: "0.03em",
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: "1rem",
                  lineHeight: 1.75,
                }}
              >
                {f.desc}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          color: "rgba(255,255,255,0.5)",
          fontSize: "0.875rem",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <p>Built for ISAZI AI for Accessibility Hackathon</p>
      </footer>
    </main >
  );
}