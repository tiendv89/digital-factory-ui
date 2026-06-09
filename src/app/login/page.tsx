"use client";

import { getUserServiceBase } from "@/services/user-service";

function getProviderUrl(provider: "google" | "github"): string {
  return `${getUserServiceBase()}/auth/${provider}/start`;
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[400px]">
        {/* Logo / brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <WorkflowLogo />
          <span className="text-lg font-semibold tracking-tight text-text-primary">
            Workflow
          </span>
        </div>

        {/* Sign-in card */}
        <div className="rounded-xl border border-border bg-surface px-8 py-8 shadow-lg">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-text-primary">
              Sign in
            </h1>
            <p className="mt-1.5 text-sm text-text-secondary">
              Use your Google or GitHub account to continue.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href={getProviderUrl("google")}
              className="group flex w-full items-center gap-3 rounded-lg border border-border bg-surface-secondary px-4 py-2.5 text-sm font-medium text-text-primary transition-colors duration-150 hover:border-primary/40 hover:bg-nav-item-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
            >
              <GoogleIcon />
              <span className="flex-1 text-center">Continue with Google</span>
            </a>

            <a
              href={getProviderUrl("github")}
              className="group flex w-full items-center gap-3 rounded-lg border border-border bg-surface-secondary px-4 py-2.5 text-sm font-medium text-text-primary transition-colors duration-150 hover:border-primary/40 hover:bg-nav-item-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
            >
              <GitHubIcon />
              <span className="flex-1 text-center">Continue with GitHub</span>
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-text-muted">
          By signing in you agree to the{" "}
          <span className="text-text-secondary">Terms of Service</span> and{" "}
          <span className="text-text-secondary">Privacy Policy</span>.
        </p>
      </div>

      {/* VS Code-style status bar */}
      <div className="fixed bottom-0 left-0 right-0 flex h-6 items-center bg-statusbar px-3">
        <span className="text-xs font-medium text-white/90">Workflow</span>
      </div>
    </div>
  );
}

function WorkflowLogo() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
      <svg
        aria-hidden="true"
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Abstract workflow / branching graph icon */}
        <circle cx="6" cy="14" r="2.5" fill="currentColor" className="text-primary" />
        <circle cx="22" cy="8" r="2.5" fill="currentColor" className="text-primary" />
        <circle cx="22" cy="20" r="2.5" fill="currentColor" className="text-primary" />
        <line
          x1="8.5"
          y1="14"
          x2="19.5"
          y2="8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="text-primary"
        />
        <line
          x1="8.5"
          y1="14"
          x2="19.5"
          y2="20"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="text-primary"
        />
      </svg>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 text-text-primary"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 0C5.372 0 0 5.373 0 12c0 5.303 3.438 9.8 8.207 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.016-2.04-3.338.725-4.042-1.61-4.042-1.61-.546-1.387-1.332-1.756-1.332-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.238 1.84 1.238 1.07 1.834 2.809 1.304 3.494.997.108-.775.419-1.305.762-1.605-2.665-.304-5.466-1.332-5.466-5.93 0-1.31.468-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 0 1 3.004-.404c1.02.005 2.046.138 3.004.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.61-2.804 5.624-5.475 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .32.216.694.824.576C20.565 21.796 24 17.3 24 12c0-6.627-5.373-12-12-12z"
      />
    </svg>
  );
}
