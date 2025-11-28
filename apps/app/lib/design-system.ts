/**
 * Design System - Centralized design tokens and utilities
 * Following modern design principles with dark mode support
 */

export const designTokens = {
    // Semantic Colors
    colors: {
        primary: {
            50: 'hsl(222 47% 95%)',
            100: 'hsl(222 47% 90%)',
            200: 'hsl(222 47% 80%)',
            300: 'hsl(222 47% 70%)',
            400: 'hsl(222 47% 60%)',
            500: 'hsl(222 47% 50%)',
            600: 'hsl(222 47% 40%)',
            700: 'hsl(222 47% 30%)',
            800: 'hsl(222 47% 20%)',
            900: 'hsl(222 47% 10%)',
        },
        success: {
            light: 'hsl(142 76% 45%)',
            DEFAULT: 'hsl(142 76% 36%)',
            dark: 'hsl(142 76% 27%)',
        },
        warning: {
            light: 'hsl(38 92% 60%)',
            DEFAULT: 'hsl(38 92% 50%)',
            dark: 'hsl(38 92% 40%)',
        },
        error: {
            light: 'hsl(0 84% 70%)',
            DEFAULT: 'hsl(0 84% 60%)',
            dark: 'hsl(0 84% 50%)',
        },
        info: {
            light: 'hsl(199 89% 58%)',
            DEFAULT: 'hsl(199 89% 48%)',
            dark: 'hsl(199 89% 38%)',
        },
    },

    // Spacing Scale (based on 4px grid)
    spacing: {
        xs: '0.25rem',   // 4px
        sm: '0.5rem',    // 8px
        md: '1rem',      // 16px
        lg: '1.5rem',    // 24px
        xl: '2rem',      // 32px
        '2xl': '3rem',   // 48px
        '3xl': '4rem',   // 64px
    },

    // Border Radius
    radius: {
        sm: '0.25rem',   // 4px
        md: '0.5rem',    // 8px
        lg: '0.75rem',   // 12px
        xl: '1rem',      // 16px
        '2xl': '1.5rem', // 24px
        full: '9999px',
    },

    // Shadows
    shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    },

    // Typography
    typography: {
        fontFamily: {
            sans: 'var(--font-sans)',
            mono: 'var(--font-mono)',
        },
        fontSize: {
            xs: ['0.75rem', { lineHeight: '1rem' }],
            sm: ['0.875rem', { lineHeight: '1.25rem' }],
            base: ['1rem', { lineHeight: '1.5rem' }],
            lg: ['1.125rem', { lineHeight: '1.75rem' }],
            xl: ['1.25rem', { lineHeight: '1.75rem' }],
            '2xl': ['1.5rem', { lineHeight: '2rem' }],
            '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
            '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        },
        fontWeight: {
            normal: '400',
            medium: '500',
            semibold: '600',
            bold: '700',
        },
    },

    // Transitions
    transitions: {
        fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
        base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
        slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
        bounce: '500ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },

    // Z-Index Scale
    zIndex: {
        dropdown: 1000,
        sticky: 1020,
        fixed: 1030,
        modalBackdrop: 1040,
        modal: 1050,
        popover: 1060,
        tooltip: 1070,
    },
} as const

// Animation Utilities
export const animations = {
    fadeIn: 'animate-in fade-in duration-200',
    fadeOut: 'animate-out fade-out duration-200',
    slideInFromTop: 'animate-in slide-in-from-top duration-300',
    slideInFromBottom: 'animate-in slide-in-from-bottom duration-300',
    slideInFromLeft: 'animate-in slide-in-from-left duration-300',
    slideInFromRight: 'animate-in slide-in-from-right duration-300',
    scaleIn: 'animate-in zoom-in-95 duration-200',
    scaleOut: 'animate-out zoom-out-95 duration-200',
} as const

// Component Variants
export const componentVariants = {
    card: {
        default: 'bg-card text-card-foreground rounded-xl border shadow-sm',
        elevated: 'bg-card text-card-foreground rounded-xl border shadow-lg',
        interactive: 'bg-card text-card-foreground rounded-xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer',
    },
    button: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md transition-all',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors',
        ghost: 'hover:bg-accent hover:text-accent-foreground transition-colors',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors',
    },
    badge: {
        default: 'bg-primary/10 text-primary border-primary/20',
        success: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
        warning: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800',
        error: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
        info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
    },
} as const

// Utility Functions
export const cn = (...classes: (string | undefined | null | false)[]) => {
    return classes.filter(Boolean).join(' ')
}

export const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
        confirmed: 'success',
        completed: 'success',
        paid: 'success',
        pending: 'warning',
        scheduled: 'info',
        cancelled: 'error',
        overdue: 'error',
        'no-show': 'error',
    }
    return statusMap[status.toLowerCase()] || 'default'
}
