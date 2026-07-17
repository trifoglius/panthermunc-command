"use client";

import Link from "next/link";
import {
  useId,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { playSfx } from "@/lib/ui-audio";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
}

const variants = {
  primary:
    "ui-btn-primary text-white border-[color:var(--btn-primary-border)] bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-bg-hover)]",
  secondary:
    "ui-btn-secondary text-[color:var(--purple-dark)] border-[color:var(--btn-secondary-border)] bg-[var(--btn-secondary-bg)] hover:bg-[color:var(--purple-light)]",
  danger: "bg-red-600 text-white hover:bg-red-700 border-red-600",
  ghost:
    "bg-transparent text-[color:var(--purple-primary)] hover:bg-[color:var(--purple-light)] border-transparent",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
};

export function buttonClassName(
  variant: ButtonProps["variant"] = "primary",
  size: ButtonProps["size"] = "md",
  className = ""
) {
  return `inline-flex items-center justify-center rounded-md border font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--select-glow)] ${variants[variant ?? "primary"]} ${sizes[size ?? "md"]} ${className}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  onClick,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClassName(variant, size, className)}
      {...props}
      onClick={(e) => {
        if (variant === "primary" && !props.disabled) {
          playSfx("sfxConfirm");
        }
        onClick?.(e);
      }}
    >
      {children}
    </button>
  );
}

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}

export function LinkButton({
  href,
  variant = "secondary",
  size = "sm",
  className = "",
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={buttonClassName(variant, size, className)}
      {...props}
    >
      {children}
    </Link>
  );
}

export function Card({
  children,
  className = "",
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <div className={`theme-glass theme-sheet ${className}`}>
      {title && (
        <div className="border-b border-[color:var(--border)] px-4 py-3">
          <h3 className="text-lg font-semibold text-[color:var(--purple-dark)]">
            {title}
          </h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function Badge({
  children,
  color = "purple",
}: {
  children: ReactNode;
  color?: "purple" | "green" | "red" | "yellow" | "gray";
}) {
  const colors = {
    purple:
      "bg-[color:var(--purple-light)] text-[color:var(--purple-dark)]",
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    yellow: "bg-yellow-100 text-yellow-800",
    gray: "bg-gray-100 text-gray-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color]}`}
    >
      {children}
    </span>
  );
}

function useFieldId(providedId?: string) {
  const autoId = useId();
  return providedId ?? autoId;
}

const labelClass =
  "mb-1 block text-sm font-medium text-[color:var(--purple-dark)]";
const fieldClass =
  "ui-input w-full rounded-md border border-[color:var(--border)] bg-[var(--input-bg,#ffffff)] px-3 py-2 text-sm text-[color:var(--foreground)] placeholder:opacity-50 focus:border-[color:var(--select-glow)] focus:outline-none focus:ring-1 focus:ring-[color:var(--select-glow)]";

export function Input({
  label,
  className = "",
  id: providedId,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const id = useFieldId(providedId);
  return (
    <label className="block" htmlFor={id}>
      {label && <span className={labelClass}>{label}</span>}
      <input id={id} className={`${fieldClass} ${className}`} {...props} />
    </label>
  );
}

export function Select({
  label,
  options,
  className = "",
  id: providedId,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: { value: string; label: string }[];
}) {
  const id = useFieldId(providedId);
  return (
    <label className="block" htmlFor={id}>
      {label && <span className={labelClass}>{label}</span>}
      <select
        id={id}
        className={`ui-select ${fieldClass} ${className}`}
        {...props}
      >
        {options.map((o, index) => (
          <option key={`${index}-${o.value}`} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Textarea({
  label,
  className = "",
  id: providedId,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  const id = useFieldId(providedId);
  return (
    <label className="block" htmlFor={id}>
      {label && <span className={labelClass}>{label}</span>}
      <textarea
        id={id}
        className={`ui-textarea ${fieldClass} ${className}`}
        {...props}
      />
    </label>
  );
}

export function Checkbox({
  label,
  description,
  className = "",
  id: providedId,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  description?: string;
}) {
  const id = useFieldId(providedId);
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-start gap-2 rounded-md border border-[color:var(--border)] px-3 py-2 hover:bg-[color:var(--purple-light)] ${className}`}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-[color:var(--border)] text-[color:var(--purple-primary)] focus:ring-[color:var(--select-glow)]"
        {...props}
      />
      <span>
        <span className="block text-sm font-medium text-[color:var(--purple-dark)]">
          {label}
        </span>
        {description && (
          <span className="block text-xs text-[color:var(--purple-primary)] opacity-80">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

export function LoadingScreen({ message = "Loading..." }: { message?: string }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-3 text-[color:var(--purple-dark)]"
      role="status"
      aria-live="polite"
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--border)] border-t-[color:var(--purple-primary)]"
        aria-hidden
      />
      <p>{message}</p>
    </div>
  );
}

export interface TabItem {
  id: string;
  label: string;
}

export function Tabs({
  tabs,
  activeId,
  onChange,
  ariaLabel,
  className = "",
}: {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex gap-1 overflow-x-auto scrollbar-thin ${className}`}
    >
      {tabs.map((tab) => {
        const selected = activeId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--select-glow)] ${
              selected
                ? "ui-tabs-selected text-white"
                : "ui-tabs-idle text-[color:var(--purple-dark)] hover:bg-[color:var(--purple-light)]"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function Table({
  children,
  stickyFirstColumn = false,
  compact = false,
  className = "",
}: {
  children: ReactNode;
  stickyFirstColumn?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`theme-sheet overflow-x-auto rounded-[var(--card-radius)] ${stickyFirstColumn ? "table-sticky-first" : ""} ${className}`}
    >
      <table className={`w-full text-left ${compact ? "text-xs" : "text-sm"}`}>
        {children}
      </table>
    </div>
  );
}

export { ToastProvider, useToast } from "./Toast";
export { Modal, ConfirmDialog } from "./Modal";
