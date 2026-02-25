import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                "navy-blue": "#002B5B",
                "cobalt-blue": "#0047AB",
                "action-red": "#E31837",
                "off-white": "#F8F9FA",
            },
            fontFamily: {
                sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
            },
            boxShadow: {
                "cobalt": "0 4px 14px rgba(0, 71, 171, 0.25)",
            },
        },
    },
    plugins: [],
};
export default config;
