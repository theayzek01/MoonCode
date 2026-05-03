const FORBIDDEN_PERSONA_TOKENS = ["sude", "canim", "sevgilim", "askim"];

function normalizeForMatch(input: string): string {
	return input
		.toLocaleLowerCase("tr-TR")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
}

export function findPersonaLeak(content: string): string | undefined {
	const normalized = normalizeForMatch(content);
	return FORBIDDEN_PERSONA_TOKENS.find((token) => normalized.includes(token));
}

export function assertNoPersonaLeak(content: string): void {
	const hit = findPersonaLeak(content);
	if (!hit) return;
	throw new Error(
		`Blocked by persona guard: detected personal persona token "${hit}" in file content. Remove persona language from code/docs and retry.`,
	);
}
