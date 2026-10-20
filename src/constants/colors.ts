/**
 * Brand colours for the few places that cannot read CSS custom properties: the browser theme-colour meta tag and HTML email.
 * The website itself reads its colours from the tokens in src/app/globals.css, which is the source of truth. Keep these in step.
 */
export const BRAND_COLORS = {
  lavender: "#CBB3E8",
  lime: "#D4FF3F",
  vermilion: "#E34234",
  ink: "#1F1530",
  deep: "#2D1B4E",
  muted: "#4F4560",
  mist: "#F8F4FC",
  border: "#DACBEE",
} as const;
