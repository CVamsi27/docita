import type { Config } from "tailwindcss";
import { designTokens } from "./src/design-tokens";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../apps/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: designTokens.colors.primary,
        secondary: designTokens.colors.secondary,
        gray: designTokens.colors.gray,
        background: "hsl(var(--color-background))",
        foreground: "hsl(var(--color-foreground))",
        muted: "hsl(var(--color-muted))",
        "muted-foreground": "hsl(var(--color-muted-foreground))",
        accent: designTokens.colors.primary[600],
        destructive: designTokens.colors.error.main,
        success: designTokens.colors.success.main,
        warning: designTokens.colors.warning.main,
        info: designTokens.colors.info.main,
      },
      fontFamily: {
        sans: designTokens.typography.fontFamily.sans.split(", "),
        mono: designTokens.typography.fontFamily.mono.split(", "),
      },
      fontSize: designTokens.typography.fontSize,
      fontWeight: designTokens.typography.fontWeight,
      spacing: designTokens.spacing,
      borderRadius: designTokens.borderRadius,
      boxShadow: designTokens.shadows,
      zIndex: designTokens.zIndex as Record<string, string | number>,
      transitionDuration: designTokens.transitions.duration as Record<
        string,
        string
      >,
      transitionTimingFunction: designTokens.transitions.timing as Record<
        string,
        string
      >,
      borderColor: {
        DEFAULT: "hsl(var(--color-border))",
      },
      backgroundColor: {
        input: "hsl(var(--color-input))",
      },
      ringColor: {
        DEFAULT: "hsl(var(--color-ring))",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/container-queries"),
  ],
};

export default config;
