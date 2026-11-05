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
        "warm-ivory": "#F4F0E8",
        "ink-black": "#111111",
        "electric-blue": "#294BFF",
        "acid-lime": "#D7E65A",
        "deep-espresso": "#211A17",
        "charcoal": "#171717",
        "muted-taupe": "#B8A99A",
        "dusty-blush": "#D8B9B4",
        "burgundy": "#70242D",
        "soft-white": "#F8F5EF",
      },
      fontFamily: {
        serif: ["Bodoni Moda", "Didot", "Cormorant Garamond", "Playfair Display", "Georgia", "serif"],
        display: ["Bodoni Moda", "Didot", "serif"],
        editorial: ["Bodoni Moda", "Cormorant Garamond", "Georgia", "serif"],
        sans: ["Plus Jakarta Sans", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.02em",
        wide: "0.08em",
        wider: "0.15em",
        widest: "0.25em",
        ultra: "0.35em",
        editorial: "0.45em",
      },
    },
  },
  plugins: [],
};

export default config;
