import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                card: "var(--card)",
                border: "var(--border)",
            },
            boxShadow: {
                'premium': '0 4px 20px -2px rgba(0, 0, 0, 0.03)',
                'premium-hover': '0 8px 30px -4px rgba(0, 0, 0, 0.05)',
                'neumorphic': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
            }
        },
    },
    plugins: [],
};
export default config;
