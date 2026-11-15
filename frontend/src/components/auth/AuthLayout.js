import React from "react";
import Link from "next/link";
import { Layers, ShieldCheck, Activity, BarChart3 } from "lucide-react";

const HIGHLIGHTS = [
  {
    icon: Activity,
    title: "Live token tracking",
    text: "See who is waiting, who is being served and who is next — as it happens.",
  },
  {
    icon: BarChart3,
    title: "Clear service analytics",
    text: "Understand waiting times and queue volume over today, 7 days or 30 days.",
  },
  {
    icon: ShieldCheck,
    title: "Private to your team",
    text: "Every manager only ever sees their own queues, tokens and reports.",
  },
];

/**
 * Split-screen shell shared by /login and /register.
 * Left: brand panel (hidden details on small screens). Right: the form card.
 */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <aside className="auth-brand" aria-label="About QueueFlow">
        <div className="auth-brand-orb auth-brand-orb-a" aria-hidden="true" />
        <div className="auth-brand-orb auth-brand-orb-b" aria-hidden="true" />
        <div className="auth-brand-grid" aria-hidden="true" />

        <div className="auth-brand-inner">
          <Link href="/login" className="auth-brand-logo">
            <span className="auth-logo-mark auth-logo-mark-light">
              <Layers size={20} />
            </span>
            <span className="auth-brand-name">QueueFlow</span>
          </Link>

          <div className="auth-brand-copy">
            <h2 className="auth-brand-headline">
              Run every queue with calm and clarity.
            </h2>
            <p className="auth-brand-sub">
              The smart queue management workspace for service teams that care
              about their customers&apos; time.
            </p>

            <ul className="auth-highlights">
              {HIGHLIGHTS.map(({ icon: Icon, title: t, text }) => (
                <li key={t} className="auth-highlight">
                  <span className="auth-highlight-icon">
                    <Icon size={18} />
                  </span>
                  <span>
                    <strong>{t}</strong>
                    <span>{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="auth-brand-foot">Smart Queue Management System</p>
        </div>
      </aside>

      <main className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-head">
            <h1 className="auth-title">{title}</h1>
            {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          </div>

          {children}

          {footer && <div className="auth-footer">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
