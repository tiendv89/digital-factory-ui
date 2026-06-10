"use client";

import { Zap } from "lucide-react";

import { getUserServiceBase } from "@/services/user-service";

function getProviderUrl(provider: "google" | "github"): string {
  return `${getUserServiceBase()}/auth/${provider}/start`;
}

const PROVIDER_BUTTON =
  "flex h-11 w-full items-center justify-center gap-2.5 rounded-[8px] border border-border-control " +
  "bg-surface-secondary text-sm font-medium text-text-primary transition-colors " +
  "hover:bg-nav-item-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg px-4">
      {/* Background grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="relative flex w-[380px] max-w-full flex-col items-stretch">
        {/* Brand */}
        <div className="flex items-center gap-3 self-center pb-10">
          <div className="flex size-10 items-center justify-center rounded-[12px] bg-primary">
            <Zap className="size-5 text-white" fill="currentColor" />
          </div>
          <div className="flex flex-col">
            <span className="text-[16px] font-bold leading-[19.2px] text-text-primary">Delivery IDE</span>
            <span className="text-[11px] leading-[13.2px] text-text-secondary">agent-native workspace</span>
          </div>
        </div>

        {/* Sign-in card */}
        <div className="w-full rounded-2xl border border-border bg-surface p-8 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
          <h1 className="text-[18px] font-semibold leading-[27px] text-text-primary">Sign in</h1>
          <p className="pt-1 text-sm text-text-secondary">Welcome back to your workspace</p>

          <div className="flex flex-col gap-2.5 pt-7">
            <a href={getProviderUrl("google")} className={PROVIDER_BUTTON}>
              <GoogleIcon />
              Continue with Google
            </a>
            <a href={getProviderUrl("github")} className={PROVIDER_BUTTON}>
              <GitHubIcon />
              Continue with GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="shrink-0 text-text-primary">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 0C5.372 0 0 5.373 0 12c0 5.303 3.438 9.8 8.207 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.016-2.04-3.338.725-4.042-1.61-4.042-1.61-.546-1.387-1.332-1.756-1.332-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.238 1.84 1.238 1.07 1.834 2.809 1.304 3.494.997.108-.775.419-1.305.762-1.605-2.665-.304-5.466-1.332-5.466-5.93 0-1.31.468-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 0 1 3.004-.404c1.02.005 2.046.138 3.004.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.61-2.804 5.624-5.475 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .32.216.694.824.576C20.565 21.796 24 17.3 24 12c0-6.627-5.373-12-12-12z"
      />
    </svg>
  );
}
