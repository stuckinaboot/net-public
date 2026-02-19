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

  // --- Layout selectors ---
  {
    selector: ".profile-themed",
    description: "Root wrapper for all themed profile content",
    category: "layout",
  },

  // --- Component selectors ---
  {
    selector: ".profile-header",
    description:
      "Profile header card (name, avatar, bio, stat pills). Uses bg-gradient from-gray-900 to-gray-800, border-green-500",
    category: "component",
  },
  {
    selector: ".profile-tabs",
    description:
      "Tab navigation bar (Canvas, Posts, Feed, Activity). Uses bg-gray-800, border-gray-700. Active tab uses bg-green-600",
    category: "component",
  },
  {
    selector: ".profile-content",
    description: "Main content area below tabs (posts, canvas, feed, activity)",
    category: "component",
  },
];

/**
 * Demo themes that users can choose from as starting points.
 * Each is a complete CSS string ready to store on-chain.
 *
 * Themes include CSS variable overrides, @keyframes animations,
 * backdrop-filter effects, and full component selector coverage
 * including .profile-content overrides.
 */
export const DEMO_THEMES: Record<string, { name: string; css: string }> = {
  checkerboard: {
    name: "Checkerboard",
    css: `@keyframes checker-scroll {
  0% { background-position: 0 0; }
  100% { background-position: 40px 40px; }
}
.profile-themed {
  --primary: 0 0% 100%;
  --primary-foreground: 0 0% 0%;
  --card: 0 0% 5%;
  --card-foreground: 0 0% 95%;
  --border: 0 0% 30%;
  --ring: 0 0% 100%;
  --muted-foreground: 0 0% 60%;
  --radius: 0px;
  color: #e0e0e0;
  background-image: repeating-conic-gradient(#333 0% 25%, #111 0% 50%);
  background-size: 40px 40px;
  animation: checker-scroll 3s linear infinite;
}
.profile-themed .profile-header {
  background: rgba(0,0,0,0.4) !important;
  background-color: rgba(0,0,0,0.4) !important;
  background-image: none !important;
  border-color: #fff !important;
  border-width: 2px;
  border-radius: 0 !important;
  backdrop-filter: blur(4px);
}
.profile-themed .profile-tabs {
  background: rgba(0,0,0,0.35) !important;
  background-color: rgba(0,0,0,0.35) !important;
  border-color: #555 !important;
  border-radius: 0 !important;
  backdrop-filter: blur(4px);
}
.profile-themed .profile-tabs button { color: #888 !important; }
.profile-themed .profile-tabs button.bg-green-600 {
  background-color: rgba(255,255,255,0.9) !important;
  color: #000 !important;
  border-radius: 0 !important;
}
.profile-themed .profile-content .border-green-400 {
  border-color: #555 !important;
  border-radius: 0 !important;
  background: rgba(0,0,0,0.35) !important;
  background-color: rgba(0,0,0,0.35) !important;
  backdrop-filter: blur(4px);
}
.profile-themed .profile-content .text-green-400 { color: #fff !important; }
.profile-themed .profile-content .text-green-300 { color: #ccc !important; }
.profile-themed .profile-content .text-white { color: #e0e0e0 !important; }
.profile-themed .profile-content .text-gray-500 { color: #666 !important; }
.profile-themed .profile-content .text-gray-400 { color: #888 !important; }`,
  },
  neonPulse: {
    name: "Neon Pulse",
    css: `@keyframes neon-glow {
  0%, 100% { border-color: #ff00ff; box-shadow: 0 0 15px #ff00ff44; }
  33% { border-color: #00ffff; box-shadow: 0 0 15px #00ffff44; }
  66% { border-color: #ffff00; box-shadow: 0 0 15px #ffff0044; }
}
@keyframes hue-rotate {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}
.profile-themed {
  --primary: 300 100% 60%;
  --primary-foreground: 0 0% 100%;
  --card: 260 80% 4%;
  --card-foreground: 280 50% 92%;
  --border: 300 100% 40%;
  --ring: 300 100% 60%;
  --muted-foreground: 280 30% 55%;
  color: #e8d0ff;
}
.profile-themed .profile-header {
  background: linear-gradient(135deg, #1a0030, #0d001a) !important;
  border-width: 2px !important;
  border-style: solid !important;
  animation: neon-glow 4s ease-in-out infinite;
}
.profile-themed .profile-tabs {
  background-color: #0d001a !important;
  border-color: #6600aa !important;
}
.profile-themed .profile-tabs button { color: #aa66dd !important; }
.profile-themed .profile-tabs button.bg-green-600 {
  background: linear-gradient(90deg, #ff00ff, #00ffff) !important;
  color: #000 !important;
  animation: hue-rotate 6s linear infinite;
}
.profile-themed .profile-content .border-green-400 {
  border-width: 1px !important;
  border-style: solid !important;
  animation: neon-glow 4s ease-in-out infinite;
}
.profile-themed .profile-content .text-green-400 { color: #ff66ff !important; }
.profile-themed .profile-content .text-green-300 { color: #cc88ff !important; }
.profile-themed .profile-content .text-white { color: #e8d0ff !important; }
.profile-themed .profile-content .text-gray-500 { color: #6644aa !important; }
.profile-themed .profile-content .text-gray-400 { color: #9966cc !important; }`,
  },
  sunset: {
    name: "Sunset",
    css: `@keyframes sunset-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
.profile-themed {
  --primary: 25 100% 55%;
  --primary-foreground: 0 0% 100%;
  --card: 15 60% 6%;
  --card-foreground: 35 80% 90%;
  --border: 20 80% 30%;
  --ring: 25 100% 55%;
  --muted-foreground: 20 40% 50%;
  color: #fde4c8;
  background: linear-gradient(135deg, #1a0a00, #2d0a1e, #0a0a2d, #1a0a00);
  background-size: 400% 400%;
  animation: sunset-shift 15s ease-in-out infinite;
}
.profile-themed .profile-header {
  background: linear-gradient(135deg, #3d1200, #2d0a1e, #1a0033) !important;
  border-color: #ff6600 !important;
  border-width: 2px;
  box-shadow: 0 0 30px #ff440022;
}
.profile-themed .profile-tabs {
  background-color: #1a0a00dd !important;
  border-color: #663300 !important;
}
.profile-themed .profile-tabs button { color: #cc8855 !important; }
.profile-themed .profile-tabs button.bg-green-600 {
  background: linear-gradient(90deg, #ff4400, #ff8800) !important;
  color: #fff !important;
}
.profile-themed .profile-content .border-green-400 {
  border-color: #ff660044 !important;
  box-shadow: 0 0 10px #ff440011;
}
.profile-themed .profile-content .text-green-400 { color: #ff8844 !important; }
.profile-themed .profile-content .text-green-300 { color: #ffaa66 !important; }
.profile-themed .profile-content .text-white { color: #fde4c8 !important; }
.profile-themed .profile-content .text-gray-500 { color: #8a6040 !important; }
.profile-themed .profile-content .text-gray-400 { color: #bb8866 !important; }`,
  },
  psychedelic: {
    name: "Dreamscape",
    css: `@keyframes dreamDrift {
  0% { background-position: 0% 50%; }
  25% { background-position: 100% 30%; }
  50% { background-position: 80% 100%; }
  75% { background-position: 20% 60%; }
  100% { background-position: 0% 50%; }
}
@keyframes floatCircles {
  0% { transform: translate(0, 0) rotate(0deg); }
  33% { transform: translate(20px, -30px) rotate(120deg); }
  66% { transform: translate(-15px, 20px) rotate(240deg); }
  100% { transform: translate(0, 0) rotate(360deg); }
}
@keyframes flowBorder {
  0% { background-position: 0 0, 0% 0%; }
  100% { background-position: 0 0, 300% 300%; }
}
@keyframes glowPulse {
  0% { box-shadow: 0 0 15px hsl(270 60% 70% / 0.3), 0 0 30px hsl(270 60% 65% / 0.1); }
  50% { box-shadow: 0 0 25px hsl(220 60% 70% / 0.4), 0 0 50px hsl(220 50% 65% / 0.15); }
  100% { box-shadow: 0 0 15px hsl(270 60% 70% / 0.3), 0 0 30px hsl(270 60% 65% / 0.1); }
}
@keyframes tabGlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.profile-themed {
  --background: 260 30% 6%;
  --foreground: 250 30% 90%;
  --primary: 270 60% 72%;
  --primary-foreground: 260 30% 10%;
  --secondary: 220 50% 65%;
  --secondary-foreground: 260 30% 10%;
  --muted: 260 20% 15%;
  --muted-foreground: 250 25% 65%;
  --accent: 200 50% 70%;
  --accent-foreground: 260 30% 10%;
  --card: 260 25% 10%;
  --card-foreground: 250 30% 90%;
  --border: 270 40% 50%;
  --ring: 270 60% 72%;
  --radius: 0.75rem;
  color: hsl(250 30% 90%) !important;
  position: relative;
  overflow: hidden;
  background-image: linear-gradient(-45deg, hsl(260 30% 8%), hsl(270 50% 30%), hsl(220 40% 25%), hsl(280 40% 20%), hsl(240 30% 12%)) !important;
  background-size: 400% 400%;
  animation: dreamDrift 20s ease-in-out infinite;
}
.profile-themed::after {
  content: "";
  position: absolute;
  top: 40px;
  left: 30px;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: hsl(270 60% 80% / 0.12);
  box-shadow:
    200px 100px 0 40px hsl(220 60% 80% / 0.1),
    50px 300px 0 60px hsl(280 50% 75% / 0.1),
    320px 400px 0 35px hsl(200 50% 80% / 0.12),
    150px 550px 0 50px hsl(260 50% 75% / 0.1);
  filter: blur(10px);
  animation: floatCircles 30s ease-in-out infinite;
  z-index: 2;
  pointer-events: none;
}
.profile-themed .profile-header {
  background: hsl(260 25% 10% / 0.75) !important;
  background-image: none !important;
  border-color: hsl(270 40% 50% / 0.3) !important;
  backdrop-filter: blur(30px) saturate(140%);
  box-shadow: 0 0 30px hsl(270 50% 60% / 0.15);
}
.profile-themed .profile-tabs {
  background-color: hsl(260 25% 12% / 0.8) !important;
  border-color: hsl(270 40% 50% / 0.3) !important;
  backdrop-filter: blur(20px) saturate(140%);
}
.profile-themed .profile-tabs button {
  color: hsl(250 25% 65%) !important;
}
.profile-themed .profile-tabs button.bg-green-600 {
  background-image: linear-gradient(90deg, hsl(270 60% 65%), hsl(220 50% 65%), hsl(280 50% 70%)) !important;
  background-size: 300% 300%;
  animation: tabGlow 8s ease infinite;
  color: hsl(0 0% 100%) !important;
}
.profile-themed .profile-content {
  background: hsl(260 25% 8% / 0.6) !important;
}
.profile-themed .profile-content .border-green-400 {
  border: 2px solid transparent !important;
  background-image:
    linear-gradient(hsl(260 25% 12% / 0.85), hsl(260 25% 12% / 0.85)),
    linear-gradient(135deg, hsl(270 60% 65%), hsl(220 50% 65%), hsl(200 50% 70%), hsl(280 50% 70%), hsl(270 60% 65%)) !important;
  background-origin: border-box !important;
  background-clip: padding-box, border-box !important;
  background-size: 100% 100%, 400% 400% !important;
  backdrop-filter: blur(15px) saturate(140%);
  animation: flowBorder 6s linear infinite, glowPulse 4s ease-in-out infinite;
}
.profile-themed .profile-content .text-green-400 {
  color: hsl(270 60% 75%) !important;
  text-shadow: 0 0 12px hsl(270 60% 70% / 0.4);
}
.profile-themed .profile-content .text-green-300 { color: hsl(220 50% 75%) !important; }
.profile-themed .profile-content .text-white { color: hsl(250 30% 90%) !important; }
.profile-themed .profile-content .text-gray-500 { color: hsl(250 20% 50%) !important; }
.profile-themed .profile-content .text-gray-400 { color: hsl(250 25% 65%) !important; }`,
  },
};

/**
 * Build an AI prompt that describes the available theming surface.
 * Feed this to an LLM alongside a user's description to generate CSS.
 *
 * The prompt includes per-selector documentation, animation guidance,
 * !important rules for beating Tailwind utilities, and supported
 * properties like backdrop-filter and box-shadow.
 *
 * @returns A prompt string listing all available selectors and usage rules
 */
export function buildCSSPrompt(): string {
  const variableLines = THEME_SELECTORS.filter(
    (s) => s.category === "variable"
  )
    .map((s) => `  ${s.selector}: ${s.description}`)
    .join("\n");

  return `You are a CSS theme generator for a user profile page.
All styles MUST be scoped under .profile-themed.

## CSS Variables (set inside .profile-themed { ... })
HSL values WITHOUT hsl() wrapper (e.g. "210 40% 98%"):
${variableLines}

## Component Selectors
  .profile-themed — root wrapper; set CSS variables, \`color\`, and optionally background/background-image/animation for full-page effects
  .profile-themed .profile-header — header card; override background, background-image: none, border-color
  .profile-themed .profile-tabs — tab bar; override background-color, border-color
  .profile-themed .profile-tabs button — inactive tab text color
  .profile-themed .profile-tabs button.bg-green-600 — active tab background + color
  .profile-themed .profile-content — content area below tabs
  .profile-themed .profile-content .border-green-400 — post card borders + background
  .profile-themed .profile-content .text-green-400 — post links/usernames
  .profile-themed .profile-content .text-green-300 — secondary links
  .profile-themed .profile-content .text-white — post body text
  .profile-themed .profile-content .text-gray-500 — timestamps
  .profile-themed .profile-content .text-gray-400 — secondary text

## Rules
1. All selectors MUST start with .profile-themed
2. Use !important on color, background, background-color, background-image, border-color overrides (needed to beat Tailwind utilities)
3. Set background-image: none !important on .profile-header to clear its default gradient
4. Set \`color\` on .profile-themed for inherited text color
5. @keyframes animations are encouraged — use for backgrounds, borders, glows
6. IMPORTANT: Do NOT use \`background\` shorthand with !important if you animate background-position — the shorthand locks background-position with !important and animations cannot override it. Use \`background-image\` instead.
7. backdrop-filter, box-shadow, and gradients are supported
8. Use valid CSS only — no JS, no expressions, no imports
9. Keep under 10KB
10. HSL values are bare: "210 40% 98%" not "hsl(210, 40%, 98%)"

Output ONLY the CSS.`;
}
