/**
 * UI foundation (DT-WP-01 Phase F).
 * Reusable neutral components + token placeholders only.
 * Must never import SecretStore (enforced by eslint + dep check).
 */
import React from "react";

export const tokens = {
  color: {
    background: "var(--dt-background, #0b0e14)",
    foreground: "var(--dt-foreground, #e6e9f0)",
    accent: "var(--dt-accent, #4f7cff)",
    muted: "var(--dt-muted, #8a93a6)",
  },
  radius: {
    md: "var(--dt-radius-md, 10px)",
  },
} as const;

export interface StatusPillProps {
  readonly label: string;
  readonly tone?: "neutral" | "ok" | "warn" | "blocked";
}

export function StatusPill({ label, tone = "neutral" }: StatusPillProps): React.JSX.Element {
  const background =
    tone === "ok"
      ? "#12361f"
      : tone === "warn"
        ? "#3a2c10"
        : tone === "blocked"
          ? "#3d1414"
          : "#1a2030";
  return React.createElement(
    "span",
    {
      style: {
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        background,
        color: "#e6e9f0",
        border: "1px solid #2a3348",
      },
    },
    label,
  );
}
