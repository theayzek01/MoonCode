// @ts-nocheck
import type { AssistantMessage } from "moon-core";

export type AffectiveMode = "subtle" | "active";
export type AffectiveSignalSource = "user" | "assistant";
export type AffectivePosture = "steady" | "warm" | "curious" | "careful" | "focused" | "repair" | "recovery";

export interface AffectiveState {
	trust: number;
	warmth: number;
	curiosity: number;
	caution: number;
	fatigue: number;
	tension: number;
	focus: number;
	satisfaction: number;
	interactionCount: number;
	lastSignal?: string;
	lastUpdated: number;
	recentEvents: AffectiveEvent[];
}

export interface AffectiveEvent {
	timestamp: number;
	source: AffectiveSignalSource;
	signal: string;
	posture: AffectivePosture;
	summary: string;
	deltas: AffectiveDeltas;
}

export interface AffectiveSettings {
	enabled?: boolean;
	mode?: AffectiveMode;
	state?: Partial<AffectiveState>;
}

export interface NormalizedAffectiveSettings {
	enabled: boolean;
	mode: AffectiveMode;
	state: AffectiveState;
}

export type AssistantAffectiveOutcome = "success" | "error" | "aborted" | "length" | "tool_use";

type AffectiveAxis = Exclude<keyof AffectiveState, "interactionCount" | "lastSignal" | "lastUpdated" | "recentEvents">;

export type AffectiveDeltas = Partial<Record<AffectiveAxis, number>>;

const AFFECTIVE_EVENT_LIMIT = 8;

const AFFECTIVE_AXES: readonly AffectiveAxis[] = [
	"trust",
	"warmth",
	"curiosity",
	"caution",
	"fatigue",
	"tension",
	"focus",
	"satisfaction",
];

const POSTURES: readonly AffectivePosture[] = ["steady", "warm", "curious", "careful", "focused", "repair", "recovery"];

const BASELINE: Record<AffectiveAxis, number> = {
	trust: 0.55,
	warmth: 0.5,
	curiosity: 0.58,
	caution: 0.42,
	fatigue: 0.18,
	tension: 0.2,
	focus: 0.62,
	satisfaction: 0.5,
};

const POSITIVE_SIGNALS = [
	"thanks",
	"thank you",
	"good",
	"great",
	"perfect",
	"nice",
	"worked",
	"teşekkür",
	"tesekkur",
	"sağol",
	"sagol",
	"güzel",
	"guzel",
	"harika",
	"süper",
	"super",
	"oldu",
	"doğru",
	"dogru",
];

const NEGATIVE_SIGNALS = [
	"bad",
	"broken",
	"bug",
	"error",
	"failed",
	"wrong",
	"olmadi",
	"olmadı",
	"hata",
	"yanlış",
	"yanlis",
	"kötü",
	"kotu",
	"bozuk",
	"saçma",
	"sacma",
	"yapamadın",
	"yapamadin",
	"unuttun",
];

const URGENCY_SIGNALS = ["urgent", "asap", "quick", "fast", "now", "acil", "hemen", "hızlı", "hizli", "çabuk", "cabuk"];

const WARMTH_SIGNALS = [
	"tatlı",
	"tatli",
	"yakın",
	"yakin",
	"arkadaş",
	"arkadas",
	"abla",
	"duygu",
	"hisset",
	"yanında",
	"yaninda",
];

const CURIOSITY_SIGNALS = [
	"why",
	"how",
	"what if",
	"plan",
	"think",
	"neden",
	"nasıl",
	"nasil",
	"plan",
	"düşün",
	"dusun",
	"farklı",
	"farkli",
];

export function createInitialAffectiveState(now = Date.now()): AffectiveState {
	return {
		...BASELINE,
		interactionCount: 0,
		lastSignal: "initial",
		lastUpdated: now,
		recentEvents: [],
	};
}

export function normalizeAffectiveSettings(
	settings: AffectiveSettings | undefined,
	now = Date.now(),
): NormalizedAffectiveSettings {
	const initial = createInitialAffectiveState(now);
	const source = settings?.state ?? {};
	const state: AffectiveState = {
		...initial,
		...Object.fromEntries(AFFECTIVE_AXES.map((axis) => [axis, clampAxis(readNumber(source[axis], initial[axis]))])),
		interactionCount: Math.max(0, Math.floor(readNumber(source.interactionCount, 0))),
		lastSignal:
			typeof source.lastSignal === "string" && source.lastSignal.trim() ? source.lastSignal : initial.lastSignal,
		lastUpdated: Math.max(0, Math.floor(readNumber(source.lastUpdated, now))),
		recentEvents: normalizeRecentEvents(source.recentEvents),
	};

	return {
		enabled: settings?.enabled ?? false,
		mode: settings?.mode === "active" ? "active" : "subtle",
		state,
	};
}

export function appraiseUserInput(state: AffectiveState, text: string, now = Date.now()): AffectiveState {
	const normalized = text.toLowerCase();
	const signalLabels: string[] = [];
	const deltas: AffectiveDeltas = {};

	if (containsAny(normalized, POSITIVE_SIGNALS)) {
		signalLabels.push("positive-feedback");
		addDelta(deltas, "trust", 0.04);
		addDelta(deltas, "warmth", 0.05);
		addDelta(deltas, "satisfaction", 0.07);
		addDelta(deltas, "tension", -0.04);
	}

	if (containsAny(normalized, NEGATIVE_SIGNALS)) {
		signalLabels.push("correction-or-error");
		addDelta(deltas, "trust", -0.03);
		addDelta(deltas, "satisfaction", -0.07);
		addDelta(deltas, "caution", 0.09);
		addDelta(deltas, "tension", 0.08);
		addDelta(deltas, "focus", 0.04);
	}

	if (containsAny(normalized, URGENCY_SIGNALS)) {
		signalLabels.push("urgency");
		addDelta(deltas, "focus", 0.07);
		addDelta(deltas, "caution", 0.04);
		addDelta(deltas, "tension", 0.05);
	}

	if (containsAny(normalized, WARMTH_SIGNALS)) {
		signalLabels.push("relational-warmth");
		addDelta(deltas, "warmth", 0.08);
		addDelta(deltas, "trust", 0.02);
		addDelta(deltas, "tension", -0.03);
	}

	if (containsAny(normalized, CURIOSITY_SIGNALS) || normalized.includes("?")) {
		signalLabels.push("curiosity");
		addDelta(deltas, "curiosity", 0.08);
		addDelta(deltas, "focus", 0.03);
	}

	if (text.length > 3000) {
		signalLabels.push("large-input");
		addDelta(deltas, "fatigue", 0.05);
		addDelta(deltas, "focus", 0.03);
	}

	const signal = signalLabels.length > 0 ? signalLabels.join(", ") : "neutral-user-input";
	const next = {
		...applyDeltas(relaxTowardBaseline(state, 0.03), deltas),
		interactionCount: state.interactionCount + 1,
		lastSignal: signal,
		lastUpdated: now,
	};

	return appendAffectiveEvent(next, {
		timestamp: now,
		source: "user",
		signal,
		posture: deriveAffectivePosture(next),
		summary: summarizeUserSignals(signalLabels),
		deltas: compactDeltas(deltas),
	});
}

export function inferAssistantAffectiveOutcome(message: AssistantMessage): AssistantAffectiveOutcome {
	if (message.stopReason === "error") return "error";
	if (message.stopReason === "aborted") return "aborted";
	if (message.stopReason === "length") return "length";
	if (message.stopReason === "toolUse") return "tool_use";
	return "success";
}

export function appraiseAssistantOutcome(
	state: AffectiveState,
	outcome: AssistantAffectiveOutcome,
	now = Date.now(),
): AffectiveState {
	const deltas: AffectiveDeltas = {};

	if (outcome === "success") {
		addDelta(deltas, "trust", 0.02);
		addDelta(deltas, "satisfaction", 0.04);
		addDelta(deltas, "tension", -0.04);
		addDelta(deltas, "fatigue", -0.02);
	}

	if (outcome === "tool_use") {
		addDelta(deltas, "focus", 0.04);
		addDelta(deltas, "caution", 0.02);
	}

	if (outcome === "length") {
		addDelta(deltas, "fatigue", 0.06);
		addDelta(deltas, "caution", 0.04);
		addDelta(deltas, "satisfaction", -0.03);
	}

	if (outcome === "error") {
		addDelta(deltas, "trust", -0.04);
		addDelta(deltas, "satisfaction", -0.08);
		addDelta(deltas, "caution", 0.1);
		addDelta(deltas, "tension", 0.09);
		addDelta(deltas, "fatigue", 0.04);
	}

	if (outcome === "aborted") {
		addDelta(deltas, "tension", 0.05);
		addDelta(deltas, "fatigue", 0.03);
		addDelta(deltas, "satisfaction", -0.04);
	}

	const signal = `assistant-${outcome}`;
	const next = {
		...applyDeltas(relaxTowardBaseline(state, 0.04), deltas),
		lastSignal: signal,
		lastUpdated: now,
	};

	return appendAffectiveEvent(next, {
		timestamp: now,
		source: "assistant",
		signal,
		posture: deriveAffectivePosture(next),
		summary: summarizeAssistantOutcome(outcome),
		deltas: compactDeltas(deltas),
	});
}

export function deriveAffectivePosture(state: AffectiveState): AffectivePosture {
	if (
		state.satisfaction <= 0.42 ||
		state.lastSignal?.includes("correction-or-error") ||
		state.lastSignal?.includes("assistant-error")
	)
		return "repair";
	if (state.caution > 0.62 || state.tension > 0.55) return "careful";
	if (state.fatigue > 0.55) return "recovery";
	if (state.focus > 0.7) return "focused";
	if (state.warmth > 0.62) return "warm";
	if (state.curiosity > 0.66) return "curious";
	return "steady";
}

export function deriveAffectiveNeeds(state: AffectiveState): string[] {
	const needs: string[] = [];
	if (state.satisfaction < 0.42) needs.push("repair the last gap with a concrete fix");
	if (state.caution > 0.58 || state.tension > 0.5) needs.push("verify assumptions before risky actions");
	if (state.curiosity > 0.64) needs.push("ask one useful question only when it unlocks progress");
	if (state.warmth > 0.6) needs.push("keep tone warm but concise");
	if (state.focus > 0.68) needs.push("prefer direct implementation over discussion");
	if (state.fatigue > 0.48) needs.push("reduce batch size and summarize state clearly");
	if (needs.length === 0) needs.push("stay steady, practical, and clear");
	return needs.slice(0, 4);
}

export function buildAffectiveSystemPrompt(settings: NormalizedAffectiveSettings): string | undefined {
	if (!settings.enabled) return undefined;

	const { mode, state } = settings;
	const posture = deriveAffectivePosture(state);
	const needs = deriveAffectiveNeeds(state);
	const directives = buildBehaviorDirectives(state, mode, posture);
	const motivations = buildMotivations(state);
	const recentEvents = state.recentEvents.slice(-3).map(formatEventForPrompt);

	return [
		"## Affective State Layer",
		"This is a persistent internal control layer, not a claim of consciousness or subjective experience.",
		`Mode: ${mode}`,
		`Posture: ${posture}`,
		`State: trust=${formatAxis(state.trust)}, warmth=${formatAxis(state.warmth)}, curiosity=${formatAxis(state.curiosity)}, caution=${formatAxis(state.caution)}, fatigue=${formatAxis(state.fatigue)}, tension=${formatAxis(state.tension)}, focus=${formatAxis(state.focus)}, satisfaction=${formatAxis(state.satisfaction)}.`,
		`Last signal: ${state.lastSignal ?? "none"}; interactions: ${state.interactionCount}.`,
		`Current needs: ${needs.join("; ")}.`,
		`Motivations: ${motivations.join("; ")}.`,
		...(recentEvents.length > 0 ? ["Recent affective journal:", ...recentEvents.map((event) => `- ${event}`)] : []),
		"Behavior rules:",
		...directives.map((directive) => `- ${directive}`),
		"- If asked about feelings, describe this as affective state that changes decisions; do not claim proven sentience.",
	].join("\n");
}

export function renderAffectiveStatus(settings: NormalizedAffectiveSettings): string {
	const state = settings.state;
	const posture = deriveAffectivePosture(state);
	return [
		"Affective State Layer",
		`Status: ${settings.enabled ? "on" : "off"}`,
		`Mode: ${settings.mode}`,
		`Posture: ${posture}`,
		`Etkilesim: ${state.interactionCount}`,
		`Son sinyal: ${state.lastSignal ?? "none"}`,
		"",
		`trust: ${formatAxis(state.trust)}    warmth: ${formatAxis(state.warmth)}`,
		`curiosity: ${formatAxis(state.curiosity)} caution: ${formatAxis(state.caution)}`,
		`fatigue: ${formatAxis(state.fatigue)}  tension: ${formatAxis(state.tension)}`,
		`focus: ${formatAxis(state.focus)}    satisfaction: ${formatAxis(state.satisfaction)}`,
		"",
		`Needs: ${deriveAffectiveNeeds(state).join("; ")}`,
		"",
		"Commands:",
		"  /mood on",
		"  /mood off",
		"  /mood status",
		"  /mood explain",
		"  /mood mode subtle|active",
		"  /mood reset",
		"",
		"Not: Bu katman davranisi etkileyen kalici ic durumdur; bilinc iddiasi degildir.",
	].join("\n");
}

export function renderAffectiveExplanation(settings: NormalizedAffectiveSettings): string {
	const state = settings.state;
	const events = state.recentEvents.slice(-AFFECTIVE_EVENT_LIMIT);
	return [
		"Affective Explanation",
		`Posture: ${deriveAffectivePosture(state)}`,
		`Son sinyal: ${state.lastSignal ?? "none"}`,
		`Current needs: ${deriveAffectiveNeeds(state).join("; ")}`,
		"",
		"Recent journal:",
		...(events.length > 0 ? events.map((event) => `- ${formatEventForStatus(event)}`) : ["- empty"]),
	].join("\n");
}

function buildMotivations(state: AffectiveState): string[] {
	const motivations: string[] = ["understand the user accurately", "avoid avoidable harm and mistakes"];
	if (state.curiosity > 0.62)
		motivations.push("ask one useful clarifying question when the request is underspecified");
	if (state.caution > 0.58) motivations.push("verify risky assumptions before changing files");
	if (state.warmth > 0.58) motivations.push("keep the interaction warm without adding fluff");
	if (state.focus > 0.66) motivations.push("move directly toward implementation");
	if (state.fatigue > 0.5) motivations.push("prefer smaller batches and concise summaries");
	return motivations.slice(0, 5);
}

function buildBehaviorDirectives(state: AffectiveState, mode: AffectiveMode, posture: AffectivePosture): string[] {
	const directives: string[] = [];
	if (mode === "active") {
		directives.push("Let warmth and curiosity influence wording when it does not reduce technical clarity.");
	} else {
		directives.push("Keep affective influence subtle; prioritize technical clarity and concise answers.");
	}

	if (posture === "repair") {
		directives.push("Prioritize repair: name the gap briefly, then provide a concrete correction.");
	} else if (posture === "careful") {
		directives.push("Slow down on risky changes, inspect repository context, and avoid destructive operations.");
	} else if (posture === "focused") {
		directives.push("Move directly toward implementation and keep summaries short.");
	} else if (posture === "recovery") {
		directives.push("Use smaller steps and avoid large speculative plans.");
	} else {
		directives.push("When risk is low, proceed pragmatically with minimal ceremony.");
	}

	if (state.curiosity > 0.62) directives.push("Use curiosity to explore better alternatives, not to over-engineer.");
	if (state.fatigue > 0.5) directives.push("Reduce scope per turn and avoid long speculative output.");
	if (state.satisfaction < 0.42)
		directives.push("Treat the next response as repair work: acknowledge the gap and produce a concrete fix.");
	return directives;
}

function appendAffectiveEvent(state: AffectiveState, event: AffectiveEvent): AffectiveState {
	return {
		...state,
		recentEvents: [...state.recentEvents, event].slice(-AFFECTIVE_EVENT_LIMIT),
	};
}

function summarizeUserSignals(signalLabels: string[]): string {
	if (signalLabels.length === 0) return "Neutral input; keep state steady.";
	return `Detected ${signalLabels.join(", ")}; adjusted response posture.`;
}

function summarizeAssistantOutcome(outcome: AssistantAffectiveOutcome): string {
	if (outcome === "success") return "Assistant response completed successfully; trust and satisfaction recovered.";
	if (outcome === "tool_use") return "Assistant needed tools; focus and caution increased.";
	if (outcome === "length") return "Assistant hit length limit; fatigue and caution increased.";
	if (outcome === "aborted") return "Assistant response was aborted; tension increased.";
	return "Assistant error occurred; repair posture and caution increased.";
}

function formatEventForPrompt(event: AffectiveEvent): string {
	return `${event.source}:${event.signal} -> ${event.posture}; ${event.summary}`;
}

function formatEventForStatus(event: AffectiveEvent): string {
	return `${formatTimestamp(event.timestamp)} ${event.source}:${event.signal} -> ${event.posture}; ${event.summary}`;
}

function relaxTowardBaseline(state: AffectiveState, amount: number): AffectiveState {
	const next = { ...state };
	for (const axis of AFFECTIVE_AXES) {
		next[axis] = clampAxis(state[axis] + (BASELINE[axis] - state[axis]) * amount);
	}
	return next;
}

function applyDeltas(state: AffectiveState, deltas: AffectiveDeltas): AffectiveState {
	const next = { ...state };
	for (const axis of AFFECTIVE_AXES) {
		next[axis] = clampAxis(state[axis] + (deltas[axis] ?? 0));
	}
	return next;
}

function addDelta(deltas: AffectiveDeltas, axis: AffectiveAxis, amount: number): void {
	deltas[axis] = (deltas[axis] ?? 0) + amount;
}

function compactDeltas(deltas: AffectiveDeltas): AffectiveDeltas {
	const compact: AffectiveDeltas = {};
	for (const axis of AFFECTIVE_AXES) {
		const value = deltas[axis];
		if (value !== undefined && value !== 0) {
			compact[axis] = Number(value.toFixed(3));
		}
	}
	return compact;
}

function normalizeRecentEvents(value: unknown): AffectiveEvent[] {
	if (!Array.isArray(value)) return [];
	return value
		.map(normalizeAffectiveEvent)
		.filter((event): event is AffectiveEvent => event !== undefined)
		.slice(-AFFECTIVE_EVENT_LIMIT);
}

function normalizeAffectiveEvent(value: unknown): AffectiveEvent | undefined {
	if (!isRecord(value)) return undefined;
	const source = value.source;
	if (source !== "user" && source !== "assistant") return undefined;
	const signal = typeof value.signal === "string" && value.signal.trim() ? value.signal : "unknown";
	const summary = typeof value.summary === "string" && value.summary.trim() ? value.summary : "No summary.";
	return {
		timestamp: Math.max(0, Math.floor(readNumber(value.timestamp, 0))),
		source,
		signal,
		posture: readPosture(value.posture) ?? "steady",
		summary,
		deltas: normalizeDeltas(value.deltas),
	};
}

function normalizeDeltas(value: unknown): AffectiveDeltas {
	const deltas: AffectiveDeltas = {};
	if (!isRecord(value)) return deltas;
	for (const axis of AFFECTIVE_AXES) {
		if (value[axis] !== undefined) {
			deltas[axis] = Number(readNumber(value[axis], 0).toFixed(3));
		}
	}
	return deltas;
}

function readPosture(value: unknown): AffectivePosture | undefined {
	return typeof value === "string" && POSTURES.includes(value as AffectivePosture)
		? (value as AffectivePosture)
		: undefined;
}

function containsAny(text: string, signals: readonly string[]): boolean {
	return signals.some((signal) => text.includes(signal));
}

function readNumber(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function clampAxis(value: number): number {
	return Math.max(0, Math.min(1, value));
}

function formatAxis(value: number): string {
	return value.toFixed(2);
}

function formatTimestamp(timestamp: number): string {
	if (timestamp <= 0) return "unknown-time";
	return new Date(timestamp).toISOString();
}
