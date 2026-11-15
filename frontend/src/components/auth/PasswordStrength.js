import React from "react";
import { Check, Circle } from "lucide-react";
import { passwordChecks, passwordStrength } from "@/utils/validators";

const RULES = [
  { key: "length", label: "At least 8 characters" },
  { key: "letter", label: "Contains a letter" },
  { key: "number", label: "Contains a number" },
];

/**
 * Four-segment strength meter plus a checklist of the required rules.
 */
export default function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = passwordChecks(password);
  const { score, label } = passwordStrength(password);

  return (
    <div className="auth-strength" aria-live="polite">
      <div className="auth-strength-bar" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`auth-strength-seg ${i <= score ? `on level-${score}` : ""}`}
          />
        ))}
      </div>
      <p className={`auth-strength-label level-${score}`}>
        Password strength: <strong>{label}</strong>
      </p>
      <ul className="auth-rules">
        {RULES.map((r) => (
          <li key={r.key} className={checks[r.key] ? "met" : ""}>
            {checks[r.key] ? <Check size={13} /> : <Circle size={9} />}
            <span>{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
