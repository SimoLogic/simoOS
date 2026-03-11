import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./lib/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // ── HOMESI Corporate Colors ──────────────────────────────────
                "navy-blue":   "#002B5B",
                "cobalt-blue": "#0047AB",
                "action-red":  "#E31837",
                "off-white":   "#F8F9FA",

                // ── VIBE Design System (Monday.com PMO palette) ───────────────
                vibe: {
                    purple:     "#6161FF",
                    "purple-dark": "#4444CC",
                    pink:       "#FF3D57",
                    green:      "#00CA72",
                    orange:     "#FDAB3D",
                    blue:       "#0086C0",
                    mirage:     "#181B34",
                    surface:    "#FFFFFF",
                    "surface-2":"#F5F6F8",
                    "surface-3":"#ECEDF0",
                    border:     "#E6E9EF",
                    "text-prime":"#323338",
                    "text-muted":"#676879",
                },
            },

            fontFamily: {
                sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
            },

            boxShadow: {
                // HOMESI legacy
                "cobalt": "0 4px 14px rgba(0, 71, 171, 0.25)",
                // Elevation system (Monday.com Vibe)
                "elevation-1": "0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.10)",
                "elevation-2": "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)",
                "elevation-3": "0 10px 25px rgba(0,0,0,0.10), 0 4px 10px rgba(0,0,0,0.06)",
                "elevation-4": "0 20px 40px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.08)",
                // Vibe Purple focus ring
                "vibe-focus":  "0 0 0 3px rgba(97, 97, 255, 0.35)",
                // Simo IS blue glow
                "simo-glow":   "0 0 0 3px rgba(0, 134, 192, 0.30)",
            },

            borderRadius: {
                // Extend Tailwind defaults with Vibe tokens
                "vibe-xs":   "4px",
                "vibe-sm":   "8px",
                "vibe-md":   "12px",
                "vibe-lg":   "16px",
                "vibe-xl":   "24px",
            },

            transitionDuration: {
                // Productive motion tokens
                "70":  "70ms",
                "100": "100ms",
                "150": "150ms",
                // Expressive motion tokens
                "250": "250ms",
                "400": "400ms",
            },

            transitionTimingFunction: {
                // PROHIBIDO usar linear — siempre usar estos
                "productive": "cubic-bezier(0.2, 0, 0.38, 0.9)",
                "expressive": "cubic-bezier(0.4, 0.14, 0.3, 1)",
                "entrance":   "cubic-bezier(0, 0, 0.38, 0.9)",
                "exit":       "cubic-bezier(0.2, 0, 1, 0.9)",
            },

            animation: {
                // PMO-specific animations
                "fade-up":      "fadeUp var(--motion-expressive-short) var(--ease-entrance) forwards",
                "slide-in-right":"slideInRight 150ms var(--ease-entrance) forwards",
                "pulse-vibe":   "pulseVibe 1.5s var(--ease-expressive) infinite",
                "task-complete":"taskComplete 400ms var(--ease-expressive) forwards",
            },

            keyframes: {
                fadeUp: {
                    "0%":   { opacity: "0", transform: "translateY(8px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                pulseVibe: {
                    "0%, 100%": { opacity: "1" },
                    "50%":      { opacity: "0.5" },
                },
                taskComplete: {
                    "0%":   { transform: "scale(1)" },
                    "50%":  { transform: "scale(1.08)" },
                    "100%": { transform: "scale(1)" },
                },
            },
        },
    },
    plugins: [],
};

export default config;
