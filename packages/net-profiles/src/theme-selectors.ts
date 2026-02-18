/**
 * Single source of truth for profile CSS theming.
 *
 * This file defines:
 * 1. THEME_SELECTORS — the stable set of CSS selectors/variables available for theming
 * 2. DEMO_THEMES — example CSS themes users can apply
 * 3. buildCSSPrompt() — generates an AI prompt describing what can be themed
 *
 * When the profile page structure changes, update THEME_SELECTORS here and
 * everything downstream (AI prompt, docs, validation) stays in sync.
 */

/**
 * A themeable selector or CSS variable group
 */
export interface ThemeSelector {
  /** CSS selector or variable name */
  selector: string;
  /** Human-readable description of what it targets */
  description: string;
  /** Category for grouping in documentation */
  category: "variable" | "layout" | "component";
}

/**
 * All themeable selectors available for profile CSS.
 *
 * CSS variables (category: "variable") are the most stable —
 * they survive page restructuring because they're part of the
 * shadcn/Tailwind design system.
 *
 * Layout and component selectors may break when the page structure changes.
 */
export const THEME_SELECTORS: ThemeSelector[] = [
  // --- CSS Variables (stable) ---
  {
    selector: "--background",
    description: "Page background color (HSL values, e.g. '210 40% 2%')",
    category: "variable",
  },
  {
    selector: "--foreground",
    description: "Default text color",
    category: "variable",
  },
  {
    selector: "--primary",
    description: "Primary accent color (buttons, links, headings)",
    category: "variable",
  },
  {
    selector: "--primary-foreground",
    description: "Text on primary-colored elements",
    category: "variable",
  },
  {
    selector: "--secondary",
    description: "Secondary accent color",
    category: "variable",
  },
  {
    selector: "--secondary-foreground",
    description: "Text on secondary-colored elements",
    category: "variable",
  },
  {
    selector: "--muted",
    description: "Muted/subdued background",
    category: "variable",
  },
  {
    selector: "--muted-foreground",
    description: "Text on muted backgrounds",
    category: "variable",
  },
  {
    selector: "--accent",
    description: "Accent color for highlights",
    category: "variable",
  },
  {
    selector: "--accent-foreground",
    description: "Text on accent-colored elements",
    category: "variable",
  },
  {
    selector: "--card",
    description: "Card/panel background color",
    category: "variable",
  },
  {
    selector: "--card-foreground",
    description: "Text inside cards",
    category: "variable",
  },
  {
    selector: "--border",
    description: "Border color",
    category: "variable",
  },
  {
    selector: "--ring",
    description: "Focus ring color",
    category: "variable",
  },
  {
    selector: "--radius",
    description: "Border radius (e.g. '0.5rem')",
    category: "variable",
  },

  // --- Layout selectors (may change with page restructuring) ---
  {
    selector: ".profile-themed",
    description: "Root wrapper for all themed profile content",
    category: "layout",
  },

  // --- Component selectors (may change with page restructuring) ---
  {
    selector: ".profile-themed .profile-header",
    description: "Profile header area (name, picture, bio)",
    category: "component",
  },
  {
    selector: ".profile-themed .profile-tabs",
    description: "Tab navigation bar",
    category: "component",
  },
  {
    selector: ".profile-themed .profile-content",
    description: "Main content area below tabs",
    category: "component",
  },
];

/**
 * Demo themes that users can choose from as starting points.
 * Each is a complete CSS string ready to store on-chain.
 */
export const DEMO_THEMES: Record<string, { name: string; css: string }> = {
  hotPink: {
    name: "Hot Pink Scene",
    css: `.profile-themed {
  --background: 320 80% 4%;
  --foreground: 320 20% 95%;
  --primary: 330 100% 60%;
  --primary-foreground: 0 0% 100%;
  --secondary: 280 60% 20%;
  --secondary-foreground: 320 20% 95%;
  --muted: 320 40% 12%;
  --muted-foreground: 320 20% 70%;
  --accent: 330 100% 60%;
  --accent-foreground: 0 0% 100%;
  --card: 320 60% 6%;
  --card-foreground: 320 20% 95%;
  --border: 330 60% 25%;
  --ring: 330 100% 60%;
}`,
  },
  midnightGrunge: {
    name: "Midnight Grunge",
    css: `.profile-themed {
  --background: 220 30% 3%;
  --foreground: 220 10% 80%;
  --primary: 45 90% 55%;
  --primary-foreground: 220 30% 5%;
  --secondary: 220 20% 12%;
  --secondary-foreground: 220 10% 80%;
  --muted: 220 20% 8%;
  --muted-foreground: 220 10% 50%;
  --accent: 45 90% 55%;
  --accent-foreground: 220 30% 5%;
  --card: 220 25% 5%;
  --card-foreground: 220 10% 80%;
  --border: 220 15% 15%;
  --ring: 45 90% 55%;
}`,
  },
  ocean: {
    name: "Deep Ocean",
    css: `.profile-themed {
  --background: 200 60% 3%;
  --foreground: 190 20% 90%;
  --primary: 190 80% 50%;
  --primary-foreground: 200 60% 5%;
  --secondary: 210 40% 15%;
  --secondary-foreground: 190 20% 90%;
  --muted: 200 40% 8%;
  --muted-foreground: 190 20% 55%;
  --accent: 170 70% 45%;
  --accent-foreground: 200 60% 5%;
  --card: 200 50% 5%;
  --card-foreground: 190 20% 90%;
  --border: 200 30% 18%;
  --ring: 190 80% 50%;
}`,
  },
};

/**
 * Build an AI prompt that describes the available theming surface.
 * Feed this to an LLM alongside a user's description to generate CSS.
 *
 * @returns A prompt string listing all available selectors and usage rules
 */
export function buildCSSPrompt(): string {
  const variableLines = THEME_SELECTORS.filter(
    (s) => s.category === "variable"
  )
    .map((s) => `  ${s.selector}: ${s.description}`)
    .join("\n");

  const layoutLines = THEME_SELECTORS.filter((s) => s.category === "layout")
    .map((s) => `  ${s.selector} — ${s.description}`)
    .join("\n");

  const componentLines = THEME_SELECTORS.filter(
    (s) => s.category === "component"
  )
    .map((s) => `  ${s.selector} — ${s.description}`)
    .join("\n");

  return `You are a CSS theme generator for a user profile page.
All styles MUST be scoped under the .profile-themed wrapper class.

## CSS Variables (stable — preferred for theming)
These use HSL values WITHOUT the hsl() wrapper (e.g. "210 40% 98%"):
${variableLines}

## Layout Selectors (may change across site updates)
${layoutLines}

## Component Selectors (may change across site updates)
${componentLines}

## Rules
1. All selectors MUST start with .profile-themed
2. CSS variables go inside .profile-themed { ... } as custom properties
3. Use only valid CSS — no JavaScript, no expressions, no imports
4. Keep the output under 10KB
5. Prefer CSS variables over direct selector styling for durability
6. HSL values are bare numbers: "210 40% 98%" not "hsl(210, 40%, 98%)"

Given a user description, output ONLY the CSS (no explanation, no markdown fences).`;
}
