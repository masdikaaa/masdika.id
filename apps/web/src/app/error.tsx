"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error caught:", error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh] px-4 py-16">
      <div className="max-w-md w-full text-center p-8 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-7 h-7" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
          Unable to load page
        </h1>

        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
          An error occurred while loading this section. Please try refreshing or
          return to the home page.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => reset()}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Try Again
          </Button>

          <Button
            variant="secondary"
            size="md"
            href="/"
            leftIcon={<Home className="w-4 h-4" />}
          >
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}

