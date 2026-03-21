import type { Config } from "tailwindcss";

const config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./types/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "var(--ds-bg-page)",
        surface: "var(--ds-bg-surface)",
        section: "var(--ds-bg-section)",
        header: "var(--ds-bg-header)",
        bottomBar: "var(--ds-bg-bottom-bar)",
        text: "var(--ds-text-primary)",
        subtle: "var(--ds-text-secondary)",
        hint: "var(--ds-text-hint)",
        link: "var(--ds-text-link)",
        accent: "var(--ds-text-accent)",
        sectionHeader: "var(--ds-text-section-header)",
        action: "var(--ds-action-primary-bg)",
        actionText: "var(--ds-action-primary-text)",
        actionSecondary: "var(--ds-action-secondary-bg)",
        actionSecondaryText: "var(--ds-action-secondary-text)",
        divider: "var(--ds-divider)",
        danger: "var(--ds-text-danger)",
        promoStart: "var(--ds-promo-start)",
        promoEnd: "var(--ds-promo-end)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        card: "var(--shadow-card)",
        halo: "var(--shadow-halo)",
      },
      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
        mono: "var(--font-mono)",
      },
      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        7: "var(--space-7)",
        8: "var(--space-8)",
      },
      transitionDuration: {
        fast: "var(--motion-fast)",
        base: "var(--motion-base)",
        slow: "var(--motion-slow)",
      },
      transitionTimingFunction: {
        standard: "var(--ease-standard)",
        soft: "var(--ease-soft)",
      },
      zIndex: {
        base: "var(--z-base)",
        sticky: "var(--z-sticky)",
        overlay: "var(--z-overlay)",
        toast: "var(--z-toast)",
      },
    },
  },
} satisfies Config;

export default config;
