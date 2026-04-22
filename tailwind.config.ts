import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        sora: ["Sora", "sans-serif"],
        plex: ["IBM Plex Mono", "monospace"],
        fraunces: ["Fraunces", "serif"],
      },
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Brand
        brand: {
          cyan: "var(--brand-cyan)",
          blue: "var(--brand-blue)",
          navy: "var(--brand-navy)",
        },
        cyan: {
          light: "var(--cyan-light)",
          dim: "var(--cyan-dim)",
          dim2: "var(--cyan-dim2)",
          border: "var(--cyan-border)",
        },
        blue: {
          dim: "var(--blue-dim)",
          border: "var(--blue-border)",
        },
        // Zona Oscura
        dk9: "var(--dk9)",
        dk8: "var(--dk8)",
        dk7: "var(--dk7)",
        dk6: "var(--dk6)",
        dkb: "var(--dkb)",
        dkbl: "var(--dkbl)",
        dkt: "var(--dkt)",
        dkt2: "var(--dkt2)",
        dktm: "var(--dktm)",
        // Zona Clara
        ltbg: "var(--ltbg)",
        ltcard: "var(--ltcard)",
        ltcard2: "var(--ltcard2)",
        ltb: "var(--ltb)",
        ltbl: "var(--ltbl)",
        ltt: "var(--ltt)",
        ltt2: "var(--ltt2)",
        lttm: "var(--lttm)",
        // Semanticos
        re: "var(--re)",
        redim: "var(--red)",
        reb: "var(--reb)",
        gr: "var(--gr)",
        grdim: "var(--grd)",
        grb: "var(--grb)",
        or: "var(--or)",
        ordim: "var(--ord)",
        orb: "var(--orb)",
        pu: "var(--pu)",
        pudim: "var(--pud)",
        pub: "var(--pub)",
        te: "var(--te)",
        tedim: "var(--ted)",
        teb: "var(--teb)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fadein": {
          from: { opacity: "0", transform: "translateY(5px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "pulse-custom": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" }
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fadein": "fadein 0.35s ease forwards",
        "pulse-custom": "pulse-custom 2s infinite ease-in-out",
        "shimmer": "shimmer 2s infinite linear"
      },
    },
  },
  plugins: [animate],
} satisfies Config;

export default config;
