import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-background shadow-[0_1px_0_rgba(27,42,74,0.04)]", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-5 py-4 border-b border-border", className)}>{children}</div>;
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-surface text-[11px] font-mono text-muted">
      {children}
    </span>
  );
}

type BadgeTone = "neutral" | "brand" | "accent" | "danger";
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) {
  const tones: Record<BadgeTone, string> = {
    neutral: "bg-surface text-muted border-border",
    brand: "bg-brand-soft text-brand border-[var(--brand)]/20",
    accent: "bg-accent-soft text-accent border-[var(--accent)]/25",
    danger: "bg-danger-soft text-danger border-[var(--danger)]/20",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap", tones[tone])}>
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  className,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "outline";
  className?: string;
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-brand text-white hover:bg-[color-mix(in_oklab,var(--brand)_88%,black)]",
    outline: "border border-border bg-background hover:bg-surface",
    ghost: "text-muted hover:text-foreground",
  };
  return (
    <button disabled={disabled} onClick={onClick} className={cn(base, variants[variant], className)}>
      {children}
    </button>
  );
}

export function Row({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-sm">
      <span className="text-muted shrink-0">{label}</span>
      <span className={cn("font-medium text-right", mono && "font-mono")}>{value}</span>
    </div>
  );
}
