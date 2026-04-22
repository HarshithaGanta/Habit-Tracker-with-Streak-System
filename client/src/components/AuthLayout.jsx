export default function AuthLayout({
  eyebrow,
  title,
  description,
  children,
  highlightTitle,
  highlightValue,
}) {
  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-showcase">
          <span className="eyebrow-badge">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>

          <div className="glass-stack">
            <article className="glass-card">
              <span>Streak Engine</span>
              <strong>Daily logic that actually feels motivating</strong>
            </article>
            <article className="glass-card highlight-card">
              <span>{highlightTitle}</span>
              <strong>{highlightValue}</strong>
            </article>
            <article className="orbit-card">
              <div className="orbit-dot" />
              <div>
                <strong>Focused momentum</strong>
                <p>Track habits, protect streaks, and keep your progress visible.</p>
              </div>
            </article>
          </div>
        </div>

        <div className="auth-card">{children}</div>
      </section>
    </main>
  );
}

