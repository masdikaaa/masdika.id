"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, MapPin, Phone, ArrowRight } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

export function Footer({ socialLinks }: { socialLinks?: any }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage("Subscribed successfully!");
        setEmail("");
        setTimeout(() => { setStatus("idle"); setMessage(""); }, 3000);
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to subscribe");
        setTimeout(() => { setStatus("idle"); setMessage(""); }, 3000);
      }
    } catch {
      setStatus("error");
      setMessage("An error occurred. Please try again.");
      setTimeout(() => { setStatus("idle"); setMessage(""); }, 3000);
    }
  };

  return (
    <footer className="relative pt-20 pb-10 z-10 border-t border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-primary)] transition-colors duration-200">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">

          {/* Column 1: Logo & Info */}
          <div className="lg:col-span-3">
            <Link href="/" className="flex items-center group w-fit mb-6">
              <img
                src={isDark ? "/masdika-logo-dark-mode.svg" : "/masdika-logo-light-mode.svg"}
                alt="Masdika Logo"
                width={130}
                height={32}
                loading="lazy"
                className="h-8 w-auto"
              />
            </Link>

            <p className="text-sm leading-relaxed mb-8 max-w-sm text-[var(--text-secondary)]">
              Professional cloud portfolio showcasing highly scalable architectures, automated deployments, and enterprise infrastructure solutions.
            </p>

            <div className="flex items-center gap-3">
              {[
                { icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"></path></svg>, link: socialLinks?.social_facebook || '#', name: 'Facebook' },
                { icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>, link: socialLinks?.social_twitter || '#', name: 'X' },
                { icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"></path></svg>, link: socialLinks?.social_linkedin || '#', name: 'LinkedIn' },
                { icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm3.98-10.98a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"></path></svg>, link: socialLinks?.social_instagram || '#', name: 'Instagram' }
              ].map((social, idx) => (
                <a
                  key={idx}
                  href={social.link}
                  aria-label={social.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 hover:border-cyan-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold mb-5 text-[var(--text-primary)]">Quick Links</h3>
            <ul className="space-y-3">
              {[
                { name: 'About Me', path: '/resume' },
                { name: 'Services', path: '/services' },
                { name: 'Portfolio', path: '/portfolio' },
                { name: 'Blog Post', path: '/blog' },
                { name: 'Looking Glass', path: '/lg' },
                { name: 'Contact Me', path: '/contact' }
              ].map((link, idx) => (
                <li key={idx}>
                  <Link
                    href={link.path}
                    className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 rounded"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Legal */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold mb-5 text-[var(--text-primary)]">Legal</h3>
            <ul className="space-y-3">
              {[
                { name: 'Terms & Conditions', path: '/terms' },
                { name: 'Privacy Policy', path: '/privacy' },
                { name: 'SLA Agreement', path: '/sla' }
              ].map((link, idx) => (
                <li key={idx}>
                  <Link
                    href={link.path}
                    className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 rounded"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold mb-5 text-[var(--text-primary)]">Contact</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Mail className="w-4 h-4 mt-0.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
                <span className="text-sm break-all text-[var(--text-secondary)]">{socialLinks?.contact_email || process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'me@masdika.id'}</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
                <span className="text-sm text-[var(--text-secondary)]">{socialLinks?.contact_location || 'Surabaya, Indonesia'}</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-4 h-4 mt-0.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
                <span className="text-sm text-[var(--text-secondary)]">{socialLinks?.contact_phone || '+62 823 3162 3374'}</span>
              </li>
            </ul>
          </div>

          {/* Column 5: Newsletter */}
          <div className="lg:col-span-3">
            <div className="rounded-xl p-6 border border-[var(--border-primary)] bg-[var(--surface-secondary)]">
              <h3 className="text-sm font-semibold mb-2 text-[var(--text-primary)]">Newsletter</h3>
              <p className="text-sm leading-relaxed mb-5 text-[var(--text-secondary)]">
                Subscribe to our newsletter for portfolio updates and cloud architecture insights.
              </p>

              <form onSubmit={handleSubscribe} className="relative flex flex-col gap-2">
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-cyan-600 dark:text-cyan-400 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email address"
                    required
                    disabled={status === "loading"}
                    className="w-full border border-[var(--border-primary)] rounded-lg py-2 pl-10 pr-11 text-sm bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 transition-colors"
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe to newsletter"
                    disabled={status === "loading"}
                    className="absolute right-1 w-8 h-8 rounded-md flex items-center justify-center transition-colors bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:opacity-50"
                  >
                    {status === "loading" ? (
                      <div className="w-4 h-4 border-2 rounded-full animate-spin border-slate-950/30 border-t-slate-950" aria-hidden="true" />
                    ) : (
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {message && (
                  <div className={`text-xs px-2 mt-1 font-medium ${status === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {message}
                  </div>
                )}
              </form>
            </div>
          </div>

        </div>

        <div className="pt-8 border-t border-[var(--border-subtle)] flex flex-col items-center justify-center gap-4">
          <p className="text-xs text-center text-[var(--text-muted)]">
            © {new Date().getFullYear()} PT Masdika Teknologi Indonesia. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
