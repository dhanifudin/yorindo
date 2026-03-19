import type { Config } from "tailwindcss";

// Tailwind CSS v4: CSS-first configuration via @theme in globals.css
// This file kept for editor tooling compat only — color tokens are in globals.css @theme inline
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};
export default config;
