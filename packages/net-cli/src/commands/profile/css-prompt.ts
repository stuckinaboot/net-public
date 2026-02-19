import { buildCSSPrompt, DEMO_THEMES } from "@net-protocol/profiles";

/**
 * Execute the profile css-prompt command — prints the AI prompt for CSS generation
 */
export async function executeProfileCSSPrompt(options: {
  listThemes?: boolean;
}): Promise<void> {
  if (options.listThemes) {
    console.log("Available demo themes:\n");
    for (const [key, theme] of Object.entries(DEMO_THEMES)) {
      console.log(`  ${key} — ${theme.name}`);
    }
    console.log(
      "\nUse with: net profile set-css --theme <name>"
    );
    return;
  }

  console.log(buildCSSPrompt());
}
