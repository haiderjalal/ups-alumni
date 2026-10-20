# Theme

The site is themed from three colours. The tokens live in `src/app/globals.css` and are the single source of truth. Components use token classes (`bg-brand-deep`, `text-brand-violet`) and never hex values. Typeface stays Inter.

| Colour | Hex | Role |
| --- | --- | --- |
| Lavender | `#CBB3E8` | Brand surface: chips, icon discs, selected and hover surfaces, soft glows, the faint wash behind the page. |
| Lime | `#D4FF3F` | Highlight: badges, step markers, text selection, marquee dots and rings on dark panels, the hero glow. |
| Vermilion | `#E34234` | Accent: link underlines, the active-nav marker, scroll progress, unread dots. Non-text use only. |

Three colours cannot carry body text on their own, so the theme adds shades of the same hues for text and dark surfaces. They are listed with their contrast ratios in `globals.css`.

| Token | Hex | Used for |
| --- | --- | --- |
| `brand-ink` | `#1F1530` | Body text and headings. |
| `brand-deep` | `#2D1B4E` | Primary buttons, active navigation, dark panels. White text on it is 15.2:1, lime 13.2:1. |
| `brand-night` | `#170E26` | Footer, text on lime badges. |
| `brand-violet` | `#5B3A8E` | Eyebrow labels and icons on light surfaces. |
| `brand-muted` | `#4F4560` | Secondary text. At least 4.7:1 on every surface, including lavender. |
| `brand-mist`, `brand-lilac` | `#F8F4FC`, `#EFE7F8` | Page background and muted sections. |
| `brand-field` | `#85729F` | Form control borders (3.6:1 or better, WCAG 1.4.11). |
| `brand-danger` | `#B3281C` | Error text and destructive actions. A dark shade of vermilion, 5.5:1 on tinted alerts. |
| `brand-success` | `#4A6600` | Success text. A dark shade of lime, 6.1:1 on tinted alerts. |

## Rules

- Lime and lavender never carry text on a light background (1.2:1 and 1.9:1 on white). On light surfaces use ink, muted or violet.
- Vermilion is 4.1:1 on white, so it is for rules, dots and underlines. Error text uses `brand-danger`.
- Inside `bg-brand-deep` and `bg-brand-night` panels the focus ring switches to lime, so keyboard focus stays visible.
- Places that cannot read CSS variables (the browser theme colour and HTML email) take their values from `src/constants/colors.ts`. Update it with `globals.css`.
