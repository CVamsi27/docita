

export const designTokens = {

  colors: {
    primary: {
      50: "#f0f9ff",
      100: "#e0f2fe",
      200: "#bae6fd",
      300: "#7dd3fc",
      400: "#38bdf8",
      500: "#0ea5e9",
      600: "#0284c7",
      700: "#0369a1",
      800: "#075985",
      900: "#0c3d66",
    },
    secondary: {
      50: "#f5f3ff",
      100: "#ede9fe",
      200: "#ddd6fe",
      300: "#c4b5fd",
      400: "#a78bfa",
      500: "#8b5cf6",
      600: "#7c3aed",
      700: "#6d28d9",
      800: "#5b21b6",
      900: "#4c1d95",
    },
    gray: {
      50: "#f9fafb",
      100: "#f3f4f6",
      200: "#e5e7eb",
      300: "#d1d5db",
      400: "#9ca3af",
      500: "#6b7280",
      600: "#4b5563",
      700: "#374151",
      800: "#1f2937",
      900: "#111827",
    },
    success: {
      light: "#dcfce7",
      main: "#22c55e",
      dark: "#15803d",
    },
    warning: {
      light: "#fef3c7",
      main: "#f59e0b",
      dark: "#b45309",
    },
    error: {
      light: "#fee2e2",
      main: "#ef4444",
      dark: "#991b1b",
    },
    info: {
      light: "#e0f2fe",
      main: "#0ea5e9",
      dark: "#0c3d66",
    },
  },

  typography: {
    fontFamily: {
      sans: [
        "system-ui",
        "-apple-system",
        "Segoe UI",
        "Roboto",
        "Helvetica Neue",
        "Arial",
        "sans-serif",
      ].join(", "),
      mono: [
        "Menlo",
        "Monaco",
        "Consolas",
        "Liberation Mono",
        "Courier New",
        "monospace",
      ].join(", "),
    },
    fontSize: {
      xs: ["12px", { lineHeight: "16px", letterSpacing: "0.4px" }],
      sm: ["14px", { lineHeight: "20px", letterSpacing: "0.25px" }],
      base: ["16px", { lineHeight: "24px", letterSpacing: "0.5px" }],
      lg: ["18px", { lineHeight: "28px", letterSpacing: "0px" }],
      xl: ["20px", { lineHeight: "28px", letterSpacing: "0px" }],
      "2xl": ["24px", { lineHeight: "32px", letterSpacing: "0px" }],
      "3xl": ["30px", { lineHeight: "36px", letterSpacing: "0px" }],
      "4xl": ["36px", { lineHeight: "40px", letterSpacing: "0px" }],
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
  },

  spacing: {
    0: "0px",
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "20px",
    6: "24px",
    8: "32px",
    10: "40px",
    12: "48px",
    16: "64px",
    20: "80px",
    24: "96px",
  },

  borderRadius: {
    none: "0px",
    sm: "2px",
    base: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
    "2xl": "16px",
    "3xl": "24px",
    full: "9999px",
  },

  shadows: {
    none: "none",
    xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    sm: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    base: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    md: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    lg: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    xl: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
  },

  zIndex: {
    hide: -1,
    auto: "auto",
    0: 0,
    10: 10,
    20: 20,
    30: 30,
    40: 40,
    50: 50,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  },

  transitions: {
    duration: {
      fast: "150ms",
      base: "200ms",
      slow: "300ms",
      slower: "500ms",
    },
    timing: {
      ease: "cubic-bezier(0.4, 0, 0.2, 1)",
      easeIn: "cubic-bezier(0.4, 0, 1, 1)",
      easeOut: "cubic-bezier(0, 0, 0.2, 1)",
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
  },

  breakpoints: {
    xs: "320px",
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },

  components: {
    button: {
      height: {
        sm: "32px",
        md: "40px",
        lg: "48px",
      },
      padding: {
        sm: "8px 12px",
        md: "10px 16px",
        lg: "12px 20px",
      },
    },
    input: {
      height: "40px",
      borderWidth: "1px",
      borderRadius: "6px",
      paddingX: "12px",
      paddingY: "8px",
    },
    card: {
      borderRadius: "8px",
      borderWidth: "1px",
      padding: "16px",
      shadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
    },
  },
};

export const darkModeTokens = {
  colors: {
    gray: {
      50: "#0f1419",
      100: "#1a202c",
      200: "#2d3748",
      300: "#4a5568",
      400: "#718096",
      500: "#a0aec0",
      600: "#cbd5e0",
      700: "#e2e8f0",
      800: "#edf2f7",
      900: "#f7fafc",
    },
  },
};

export type DesignTokens = typeof designTokens;
