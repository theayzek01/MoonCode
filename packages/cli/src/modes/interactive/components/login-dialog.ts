// @ts-nocheck

import { exec } from "node:child_process";
import { getOAuthProviders } from "moon-core/oauth";
import { Container, type Focusable, getKeybindings, Input, Spacer, Text, type TUI } from "moon-tui";
import { theme } from "../theme/theme.js";
import { DynamicBorder } from "./dynamic-border.js";
import { keyHint } from "./keybinding-hints.js";

/**
 * Login dialog component - replaces editor during OAuth login flow.
 * Styled to match the MoonCode control surfaces.
 */
export class LoginDialogComponent extends Container implements Focusable {
	private contentContainer: Container;
	private input: Input;
	private tui: TUI;
	private abortController = new AbortController();
	private inputResolver?: (value: string) => void;
	private inputRejecter?: (error: Error) => void;
	private providerName: string;
	private title: string;

	private _focused = false;
	get focused(): boolean {
		return this._focused;
	}
	set focused(value: boolean) {
		this._focused = value;
		this.input.focused = value;
	}

	constructor(
		tui: TUI,
		providerId: string,
		private onComplete: (success: boolean, message?: string) => void,
		providerNameOverride?: string,
		titleOverride?: string,
	) {
		super();
		this.tui = tui;

		const providerInfo = getOAuthProviders().find((p) => p.id === providerId);
		this.providerName = providerNameOverride || providerInfo?.name || providerId;
		this.title = titleOverride ?? `${this.providerName} login`;

		this.addChild(new DynamicBorder());
		this.addChild(new Spacer(1));
		this.addChild(new Text(theme.fg("accent", theme.bold("MoonCode")) + theme.fg("muted", " | Login"), 1, 0));
		this.addChild(new Text(theme.fg("muted", "Provider login and callback flow stay inside this panel."), 1, 0));
		this.addChild(new Text(theme.fg("text", `Provider: ${this.providerName}`), 1, 0));
		this.addChild(new Spacer(1));

		this.contentContainer = new Container();
		this.addChild(this.contentContainer);

		this.input = new Input();
		this.input.onSubmit = () => {
			if (this.inputResolver) {
				this.inputResolver(this.input.getValue());
				this.inputResolver = undefined;
				this.inputRejecter = undefined;
			}
		};
		this.input.onEscape = () => {
			this.cancel();
		};

		this.addChild(new Spacer(1));
		this.addChild(new DynamicBorder());
	}

	get signal(): AbortSignal {
		return this.abortController.signal;
	}

	private cancel(): void {
		this.abortController.abort();
		if (this.inputRejecter) {
			this.inputRejecter(new Error("Login cancelled"));
			this.inputResolver = undefined;
			this.inputRejecter = undefined;
		}
		this.onComplete(false, "Login cancelled");
	}

	/**
	 * Called by onAuth callback - show URL and optional instructions.
	 */
	showAuth(url: string, instructions?: string): void {
		this.contentContainer.clear();
		this.contentContainer.addChild(new Spacer(1));
		this.contentContainer.addChild(new Text(theme.fg("accent", theme.bold("Login URL")), 1, 0));
		this.contentContainer.addChild(new Text(theme.fg("text", url), 1, 0));

		const clickHint = process.platform === "darwin" ? "Open with Cmd+click" : "Open with Ctrl+click";
		const hyperlink = `\x1b]8;;${url}\x07${clickHint}\x1b]8;;\x07`;
		this.contentContainer.addChild(new Text(theme.fg("dim", hyperlink), 1, 0));

		if (instructions) {
			this.contentContainer.addChild(new Spacer(1));
			this.contentContainer.addChild(new Text(theme.fg("warning", instructions), 1, 0));
		}

		const openCmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
		exec(`${openCmd} "${url}"`);

		this.tui.requestRender();
	}

	/**
	 * Show input for manual code/URL entry (for callback server providers).
	 */
	showManualInput(prompt: string): Promise<string> {
		this.contentContainer.addChild(new Spacer(1));
		this.contentContainer.addChild(new Text(theme.fg("dim", prompt), 1, 0));
		this.contentContainer.addChild(this.input);
		this.contentContainer.addChild(new Text(`(${keyHint("tui.select.cancel", "cancel")})`, 1, 0));
		this.tui.requestRender();

		return new Promise((resolve, reject) => {
			this.inputResolver = resolve;
			this.inputRejecter = reject;
		});
	}

	/**
	 * Called by onPrompt callback - show prompt and wait for input.
	 */
	showPrompt(message: string, placeholder?: string): Promise<string> {
		this.contentContainer.addChild(new Spacer(1));
		this.contentContainer.addChild(new Text(theme.fg("text", message), 1, 0));
		if (placeholder) {
			this.contentContainer.addChild(new Text(theme.fg("dim", `e.g., ${placeholder}`), 1, 0));
		}
		this.contentContainer.addChild(this.input);
		this.contentContainer.addChild(
			new Text(`(${keyHint("tui.select.cancel", "cancel")}, ${keyHint("tui.select.confirm", "send")})`, 1, 0),
		);

		this.input.setValue("");
		this.tui.requestRender();

		return new Promise((resolve, reject) => {
			this.inputResolver = resolve;
			this.inputRejecter = reject;
		});
	}

	/**
	 * Show informational text without prompting for input.
	 */
	showInfo(lines: string[]): void {
		this.contentContainer.clear();
		this.contentContainer.addChild(new Spacer(1));
		for (const line of lines) {
			this.contentContainer.addChild(new Text(line, 1, 0));
		}
		this.contentContainer.addChild(new Spacer(1));
		this.contentContainer.addChild(new Text(`(${keyHint("tui.select.cancel", "close")})`, 1, 0));
		this.tui.requestRender();
	}

	/**
	 * Show waiting message (for polling flows like GitHub Copilot).
	 */
	showWaiting(message: string): void {
		this.contentContainer.addChild(new Spacer(1));
		this.contentContainer.addChild(new Text(theme.fg("dim", message), 1, 0));
		this.contentContainer.addChild(new Text(`(${keyHint("tui.select.cancel", "cancel")})`, 1, 0));
		this.tui.requestRender();
	}

	/**
	 * Called by onProgress callback.
	 */
	showProgress(message: string): void {
		this.contentContainer.addChild(new Text(theme.fg("dim", message), 1, 0));
		this.tui.requestRender();
	}

	handleInput(data: string): void {
		const kb = getKeybindings();

		if (kb.matches(data, "tui.select.cancel")) {
			this.cancel();
			return;
		}

		this.input.handleInput(data);
	}
}
