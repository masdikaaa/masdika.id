"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>Something Went Wrong | Masdika</title>
        <meta
          name="description"
          content="An unexpected error occurred. Please refresh the page or try again."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, follow" />
      </head>
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: "#030712",
          color: "#f3f4f6",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        <main
          role="main"
          style={{
            maxWidth: "28rem",
            width: "100%",
            textAlign: "center",
            padding: "2rem",
            borderRadius: "1rem",
            backgroundColor: "#0b1222",
            border: "1px solid rgba(6, 182, 212, 0.2)",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div
            style={{
              width: "3rem",
              height: "3rem",
              borderRadius: "9999px",
              backgroundColor: "rgba(6, 182, 212, 0.1)",
              border: "1px solid rgba(6, 182, 212, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
              color: "#22d3ee",
              fontSize: "1.25rem",
              fontWeight: "bold",
            }}
          >
            !
          </div>

          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "#ffffff",
              marginBottom: "0.5rem",
            }}
          >
            Something went wrong
          </h1>

          <p
            style={{
              fontSize: "0.875rem",
              color: "#9ca3af",
              lineHeight: 1.5,
              marginBottom: "1.5rem",
            }}
          >
            We encountered an unexpected issue while loading this page. Please
            try again.
          </p>

          <button
            onClick={() => reset()}
            style={{
              padding: "0.625rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#020617",
              backgroundColor: "#22d3ee",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
          >
            Try Again
          </button>
        </main>
      </body>
    </html>
  );
}

