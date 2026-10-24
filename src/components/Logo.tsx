import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "full" | "mark";
  className?: string;
  theme?: "light" | "dark";
}

export default function Logo({
  size = "md",
  variant = "full",
  className = "",
  theme = "light",
}: LogoProps) {
  // Dimensions based on size
  const iconSize = size === "sm" ? 28 : size === "lg" ? 44 : 36;
  const titleSize = size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-xl";
  const subtextSize = size === "sm" ? "text-[8px]" : size === "lg" ? "text-[10px]" : "text-[9px]";

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Dynamic Brandmark Emblem */}
      <div
        className="relative shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
        style={{ width: iconSize, height: iconSize }}
      >
        <svg
          viewBox="0 0 100 100"
          width={iconSize}
          height={iconSize}
          className="drop-shadow-md"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="logo-emblem-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E40AF" />
              <stop offset="50%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
            <linearGradient id="logo-spark-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>

          {/* Squircle Base Container */}
          <rect
            x="6"
            y="6"
            width="88"
            height="88"
            rx="24"
            fill="url(#logo-emblem-grad)"
          />
          {/* Subtle Inner Highlight Rim */}
          <rect
            x="6"
            y="6"
            width="88"
            height="88"
            rx="24"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="2"
          />

          {/* Modern Shopping Tote Bag Handle */}
          <path
            d="M38 40 C38 27, 62 27, 62 40"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="5.5"
            strokeLinecap="round"
          />

          {/* Stylized Modern Shopping Bag Body */}
          <path
            d="M26 38 L74 38 C75.8 38 77.3 39.4 77.1 41.2 L73.2 73.2 C72.4 79 67.5 83.5 61.6 83.5 L38.4 83.5 C32.5 83.5 27.6 79 26.8 73.2 L22.9 41.2 C22.7 39.4 24.2 38 26 38 Z"
            fill="#FFFFFF"
            fillOpacity="0.18"
            stroke="#FFFFFF"
            strokeWidth="5"
            strokeLinejoin="round"
          />

          {/* Central Bold 'V' Monogram (for VarsMart) */}
          <path
            d="M39 48 L50 69 L61 48"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Energetic 4-Point Sparkle Star (Top-Right) */}
          <path
            d="M74 14 C74 21, 81 28, 88 28 C81 28, 74 35, 74 42 C74 35, 67 28, 60 28 C67 28, 74 21, 74 14 Z"
            fill="url(#logo-spark-grad)"
          />
        </svg>
      </div>

      {/* Typography Wordmark */}
      {variant === "full" && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center tracking-tight font-black">
            <span className={theme === "dark" ? "text-white" : "text-slate-900" + " " + titleSize}>
              Vars
            </span>
            <span className={`bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent ${titleSize}`}>
              Mart
            </span>
            <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-cyan-500" />
          </div>
          <span className={`font-extrabold uppercase tracking-widest text-slate-400 ${subtextSize} mt-0.5`}>
            Campus Market
          </span>
        </div>
      )}
    </div>
  );
}
