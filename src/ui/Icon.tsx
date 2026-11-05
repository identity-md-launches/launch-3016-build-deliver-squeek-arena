import type { CSSProperties } from "react";
const paths: Record<string, string> = {
  play: "M8 5v14l11-7z",
  pause: "M8 5v14M16 5v14",
  volume: "M11 5 6 9H3v6h3l5 4zM15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16",
  muted: "M11 5 6 9H3v6h3l5 4zM16 9l6 6M22 9l-6 6",
  settings:
    "M9 3h6l1 4 4 1v7l-4 2-1 4H9l-1-4-4-2V8l4-1zM15 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0",
  character: "M5 20v-3a7 7 0 0 1 14 0v3M16 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0",
  trophy:
    "M8 3h8v8a4 4 0 0 1-8 0zM8 5H4v3a4 4 0 0 0 4 4M16 5h4v3a4 4 0 0 1-4 4M12 15v6M8 21h8",
  arrow: "M4 12h16M14 6l6 6-6 6",
  left: "m15 5-7 7 7 7",
  right: "m9 5 7 7-7 7",
  up: "m5 15 7-7 7 7",
  attack: "m4 20 6-6m-2-2 4 4m-2-4L19 3l2 2-9 9",
  dash: "m3 5 7 7-7 7m9-14 7 7-7 7",
  check: "m5 12 4 4L19 6",
  lock: "M6 10h12v11H6zM8 10V7a4 4 0 0 1 8 0v3",
  close: "m6 6 12 12M18 6 6 18",
  wallet: "M3 6h18v14H3zM3 6V3h15v3M16 11h5v5h-5z",
  globe:
    "M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0M3 12h18M12 3c6 5 6 13 0 18-6-5-6-13 0-18",
  refresh: "M20 8a8 8 0 1 0 0 9M20 3v5h-5",
  help: "M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0M9 9a3 3 0 1 1 4 3l-1 1M12 16v1",
  flag: "M5 21V3h14l-3 5 3 5H5",
  seed: "M12 3c7 4 8 10 4 15s-10 3-10-3S8 6 12 3zM12 7l-2 10",
  spark: "m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3z",
  external: "M14 3h7v7M21 3l-9 9M10 4H4v16h16v-6",
  home: "m3 11 9-8 9 8M5 9v12h5v-7h4v7h5V9",
  clock: "M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0M12 6v6l4 2",
  heart: "M20 5c-3-3-6-1-8 1-2-2-5-4-8-1s-1 6 1 8l7 8 7-8c2-2 4-5 1-8z",
};
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name] || paths.spark} />
    </svg>
  );
}
