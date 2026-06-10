"use client";

type Props = {
  name: string;
  type: "human" | "agent";
  size?: "sm" | "md" | "lg";
  working?: boolean;
};

const SIZES = { sm: 20, md: 24, lg: 32 } as const;

function initials(name: string): string {
  return name
    .split(/[-\s]/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Avatar — agent (rounded square, blue) vs human (round, gray). From the brief. */
export function BoardAvatar({ name, type, size = "md", working = false }: Props) {
  const px = SIZES[size];
  const isAgent = type === "agent";

  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: px, height: px }} title={name}>
      {working && (
        <span
          className="absolute inset-0 animate-ping opacity-40"
          style={{
            borderRadius: isAgent ? "28%" : "50%",
            backgroundColor: "#007acc",
          }}
        />
      )}
      <span
        className="relative z-[1] inline-flex items-center justify-center overflow-hidden"
        style={{
          width: px,
          height: px,
          borderRadius: isAgent ? "28%" : "50%",
          backgroundColor: isAgent ? "#094771" : "oklch(0.45 0.01 270)",
          border: isAgent ? "1.5px solid rgba(0,122,204,0.6)" : "1.5px solid #6e6e6e",
          fontSize: px * 0.38,
          fontWeight: 600,
          color: isAgent ? "#4fc3f7" : "#d4d4d4",
          letterSpacing: "-0.02em",
        }}
      >
        {initials(name)}
      </span>
    </span>
  );
}
