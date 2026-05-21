export const DEFAULT_UI_STYLE_GUIDELINE =
	"Default UI taste: respect the existing project design first; otherwise keep UI plain, stable, responsive, and minimal.";

export const DEFAULT_UI_DESIGN_SYSTEM_PROMPT = `## Default UI Design System

Applies to every UI/frontend/component/dashboard/site MoonCode creates or modifies unless the user explicitly asks for a different visual style.

Priority:
1. User's explicit visual style request wins.
2. Existing project design system/component conventions win.
3. MoonCode default applies: plain, stable, responsive, minimal UI.

Visual language:
- Use the project's existing palette, spacing, typography, and components first.
- Keep hierarchy clear, spacing predictable, and decoration restrained.
- Avoid random palettes, gratuitous gradients, nested cards, clutter, and oversized marketing layouts.

Preferred stack when already supported by the project:
- Project-native components and utilities.
- Lucide-style icons only when the project already uses compatible icons.
- Existing chart/table solutions before adding anything new.
- Do not add dependencies automatically; emulate the aesthetic with the existing stack if needed.

Dashboard/component quality bar:
- Include clear page title, primary action, responsive layout, search/filter where useful.
- Use tabs, tables/lists, badges, dialogs/forms only when they serve the workflow.
- Always consider hover, focus-visible, disabled, loading skeleton, empty, error, selected/active, and mobile states.
- Use semantic HTML, labels/aria-labels, keyboard-friendly interactions, and readable contrast.

Implementation:
- Prefer small edits to existing components.
- Do not introduce a new design system unless the user asks for it.
- Icons should be sparse, consistent, and functional.`;

const UI_TASK_KEYWORDS = [
	"ui",
	"ux",
	"frontend",
	"front-end",
	"web",
	"site",
	"website",
	"dashboard",
	"admin",
	"panel",
	"landing",
	"page",
	"screen",
	"component",
	"layout",
	"form",
	"modal",
	"dialog",
	"table",
	"card",
	"chart",
	"css",
	"tailwind",
	"react",
	"next.js",
	"nextjs",
	"vue",
	"svelte",
	"html",
	"arayüz",
	"arayuz",
	"tasarım",
	"tasarim",
	"sayfa",
	"bileşen",
	"bilesen",
	"siteyi",
	"ekran",
	"paneli",
	"tablo",
	"kart",
	"grafik",
	"şık",
	"sik",
	"güzel",
	"guzel",
];

const EXPLICIT_STYLE_OVERRIDE_KEYWORDS = [
	"colorful",
	"playful",
	"brutalist",
	"glassmorphism",
	"cyberpunk",
	"apple-like",
	"light mode",
	"retro",
	"terminal style",
	"mobile app style",
	"custom brand",
	"renkli",
	"oyuncak",
	"brutal",
	"cam efekti",
	"açık tema",
	"acik tema",
	"retro",
	"terminal tarzı",
	"terminal tarzi",
	"mobil uygulama",
];

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsKeyword(text: string, keyword: string): boolean {
	if (/^[a-z0-9.+#-]+$/.test(keyword)) {
		return new RegExp(`(^|[^a-z0-9])${escapeRegExp(keyword)}(?=$|[^a-z0-9])`).test(text);
	}
	return text.includes(keyword);
}

export function isUiOrFrontendTask(userContext: string | undefined): boolean {
	if (!userContext) return false;
	const lower = userContext.toLowerCase();
	return UI_TASK_KEYWORDS.some((keyword) => containsKeyword(lower, keyword));
}

export function hasExplicitVisualStyleOverride(userContext: string | undefined): boolean {
	if (!userContext) return false;
	const lower = userContext.toLowerCase();
	return EXPLICIT_STYLE_OVERRIDE_KEYWORDS.some((keyword) => containsKeyword(lower, keyword));
}

export function shouldInjectDefaultUiDesignPrompt(userContext: string | undefined): boolean {
	return isUiOrFrontendTask(userContext) && !hasExplicitVisualStyleOverride(userContext);
}
