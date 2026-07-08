"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

type BackButtonProps = {
  label?: string;
  fallbackHref?: string;
  className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function BackButton({ label = "Back", fallbackHref = "/", className }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={cx(
        "inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] px-3 text-sm text-[var(--ink)] shadow-[0_8px_18px_rgba(39,34,27,0.06)] outline-none transition hover:bg-white",
        className,
      )}
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}
