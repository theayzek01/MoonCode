/**
 * Built-in design direction library.
 *
 * 5 curated schools — each ships a deterministic OKLch palette + font stack.
 * When the user hasn't specified a brand, the agent picks or lets the user
 * choose. One pick → concrete tokens, no model improvisation.
 *
 * Inspired by Open Design's direction system but stripped to essentials.
 */

export interface DesignDirection {
	/** kebab-case id */
	id: string;
	/** Short label (≤60 chars) */
	label: string;
	/** One-paragraph mood description */
	mood: string;
	/** Real-world references */
	references: string[];
	/** Headline font stack (CSS-ready) */
	displayFont: string;
	/** Body font stack (CSS-ready) */
	bodyFont: string;
	/** Six palette values in OKLch */
	palette: {
		bg: string;
		surface: string;
		fg: string;
		muted: string;
		border: string;
		accent: string;
	};
	/** Layout posture cues — concrete, not vague */
	posture: string[];
}

export const DESIGN_DIRECTIONS: DesignDirection[] = [
	{
		id: "modern-minimal",
		label: "Modern Minimal — Linear / Vercel / Stripe",
		mood: "Quiet, precise, software-native. System fonts, crisp neutrals, and a focused product palette so the UI feels shipped rather than greyscale.",
		references: ["Linear", "Vercel", "Notion 2024", "Stripe docs"],
		displayFont: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
		bodyFont: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
		palette: {
			bg: "oklch(99% 0.002 240)",
			surface: "oklch(100% 0 0)",
			fg: "oklch(18% 0.012 250)",
			muted: "oklch(54% 0.012 250)",
			border: "oklch(92% 0.005 250)",
			accent: "oklch(58% 0.18 255)", // cobalt
		},
		posture: [
			"tight letter-spacing on display sizes (-0.02em)",
			"hairline borders only, no shadows except dropdowns/modals",
			"mono numerics with tabular-nums",
			"sticky frosted nav, content-led layouts",
			"primary action color + one secondary signal + status colors",
		],
	},
	{
		id: "editorial-monocle",
		label: "Editorial — Monocle / FT Magazine",
		mood: "Print-magazine feel. Generous whitespace, large serif headlines, restrained palette of neutral paper + ink + single accent.",
		references: ["Monocle", "FT Weekend", "NYT Magazine"],
		displayFont: "'Iowan Old Style', 'Charter', Georgia, serif",
		bodyFont: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
		palette: {
			bg: "oklch(98% 0.004 95)",
			surface: "oklch(100% 0.002 95)",
			fg: "oklch(20% 0.018 70)",
			muted: "oklch(48% 0.012 70)",
			border: "oklch(90% 0.006 95)",
			accent: "oklch(52% 0.10 28)", // editorial red
		},
		posture: [
			"serif display, sans body, mono for metadata only",
			"no shadows, no rounded cards — borders + whitespace",
			"one decisive image, cropped only at the bottom",
			"kicker/eyebrow in mono uppercase, accent used at most twice",
		],
	},
	{
		id: "human-approachable",
		label: "Human / Approachable — Airbnb / Duolingo",
		mood: "Friendly and tactile. Clean neutral background, product-led color, generous radii. Good for consumer tools, education, marketplaces.",
		references: ["Airbnb", "Duolingo", "Miro", "Mercury"],
		displayFont: "'Söhne', 'Avenir Next', -apple-system, system-ui, sans-serif",
		bodyFont: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
		palette: {
			bg: "oklch(98% 0.004 240)",
			surface: "oklch(100% 0 0)",
			fg: "oklch(20% 0.02 240)",
			muted: "oklch(50% 0.018 240)",
			border: "oklch(90% 0.006 240)",
			accent: "oklch(56% 0.12 170)", // brand-safe teal
		},
		posture: [
			"generous border-radius (12-16px on cards, 8px on buttons)",
			"subtle shadows for elevation, not borders",
			"illustration-friendly: leave room for spot illustrations",
			"warm photography, rounded avatars, comfortable spacing",
		],
	},
	{
		id: "tech-utility",
		label: "Tech Utility — GitHub / Tailwind / Raycast",
		mood: "Developer-tool aesthetic. Monospace accents, dark-mode native, utility-driven layouts. Information-dense without being cluttered.",
		references: ["GitHub Primer", "Tailwind UI", "Raycast", "Warp"],
		displayFont: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
		bodyFont: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
		palette: {
			bg: "oklch(16% 0.01 260)",
			surface: "oklch(22% 0.012 260)",
			fg: "oklch(92% 0.008 260)",
			muted: "oklch(60% 0.012 260)",
			border: "oklch(32% 0.008 260)",
			accent: "oklch(72% 0.16 145)", // terminal green
		},
		posture: [
			"dark mode default, monospace for code/data",
			"compact spacing, 4px base unit",
			"command-palette patterns, keyboard-first",
			"badge/chip elements for status, no decorative elements",
		],
	},
	{
		id: "brutalist-experimental",
		label: "Brutalist / Experimental — Anti-design",
		mood: "Raw, intentional, grid-breaking. System fonts at extreme weights, high-contrast, deliberately rough. For portfolios, creative studios, editorial experiments.",
		references: ["Bloomberg Businessweek", "Virgil Abloh", "Brutalist Websites"],
		displayFont: "'Arial Black', 'Impact', system-ui, sans-serif",
		bodyFont: "'Arial', 'Helvetica Neue', system-ui, sans-serif",
		palette: {
			bg: "oklch(100% 0 0)",
			surface: "oklch(95% 0.005 90)",
			fg: "oklch(0% 0 0)",
			muted: "oklch(45% 0.01 90)",
			border: "oklch(0% 0 0)",
			accent: "oklch(62% 0.25 30)", // raw red
		},
		posture: [
			"extreme type scale jumps (14px body → 72px+ headlines)",
			"thick borders (2-4px), no rounded corners (0px radius)",
			"no shadows, no gradients — flat and raw",
			"deliberately asymmetric layouts, overlapping elements OK",
		],
	},
];
