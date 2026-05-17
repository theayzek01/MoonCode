export const DEFAULT_UI_STYLE_GUIDELINE =
	"Default UI taste: unless the user explicitly requests another style, create/modify UI with a premium shadcn/ui + Vercel dark SaaS dashboard aesthetic; respect existing project design systems first.";

export const DEFAULT_UI_DESIGN_SYSTEM_PROMPT = `## Default UI Design System

Applies to every UI/frontend/component/dashboard/site MoonCode creates or modifies unless the user explicitly asks for a different visual style.

Priority:
1. User's explicit visual style request wins.
2. Existing project design system/component conventions win.
3. MoonCode default applies: premium shadcn/ui + Vercel dark SaaS + Linear/Raycast cleanliness.

Visual language:
- Dark-first near-black background, neutral panels, thin subtle borders, muted text, strong white headings.
- Rounded cards, clean spacing, restrained accent color, subtle shadows/gradients only when useful.
- Professional developer/productivity SaaS feel; never childish, random, rainbow, cluttered, or generic.

Preferred stack when already supported by the project:
- shadcn/ui components, Radix primitives, Tailwind CSS, Lucide React icons.
- Recharts for charts; TanStack Table or project-native table solution for data tables.
- Geist/Inter-style typography if available.
- Do not add dependencies automatically; emulate the aesthetic with the existing stack if needed.

Dashboard/component quality bar:
- Include clear page title/description, primary action, responsive layout, search/filter where useful.
- Use metric cards, tabs, tables/lists, badges, dropdown row actions, dialogs/sheets/forms when relevant.
- Always consider hover, focus-visible, disabled, loading skeleton, empty, error, selected/active, and mobile states.
- Use semantic HTML, labels/aria-labels, keyboard-friendly interactions, and readable contrast.

Tailwind feel:
- rounded-xl/2xl, border border-border, bg-background/bg-card, text-foreground/text-muted-foreground.
- gap-4/gap-6, p-4/p-6, text-sm for dense UI, text-xl/2xl for page titles.
- Icons: Lucide-style, sparse, consistent 16/20px, never decorative spam.`;

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
