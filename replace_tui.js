import fs from "fs";

const file = "packages/tui/src/tui.ts";
let content = fs.readFileSync(file, "utf8");

const startIdx = content.indexOf("private doRender(): void {");
const endStr = "\t/**\n\t * Position the hardware cursor for IME candidate window.";
const endIdx = content.indexOf(endStr);

if (startIdx === -1 || endIdx === -1) {
    console.log("Could not find start or end index.");
    process.exit(1);
}

const replacement = `private doRender(): void {
		if (this.stopped) return;
		const width = this.terminal.columns;
		const height = this.terminal.rows;
		const widthChanged = this.previousWidth !== 0 && this.previousWidth !== width;
		const heightChanged = this.previousHeight !== 0 && this.previousHeight !== height;

		// Render all components to get new lines
		let newLines = this.render(width);

		// Composite overlays into the rendered lines (before differential compare)
		if (this.overlayStack.length > 0) {
			newLines = this.compositeOverlays(newLines, width, height);
		}

		// Extract cursor position before applying line resets (marker must be found first)
		const cursorPos = this.extractCursorPosition(newLines, height);

		// Clamp lines to width so we don't accidentally wrap
		for (let i = 0; i < newLines.length; i++) {
			let line = newLines[i];
			if (!isImageLine(line) && visibleWidth(line) > width) {
				line = sliceByColumn(line, 0, width, true) + TUI.SEGMENT_RESET;
				newLines[i] = line;
			}
		}

		let buffer = "";
		const useSync = process.env.PI_SYNC_OUTPUT !== "0" && !isTermuxSession();
		if (useSync) buffer += "\\x1b[?2026h";

		const fullRender = (clearScreen: boolean) => {
			if (clearScreen) {
				buffer += "\\x1b[2J\\x1b[H";
			}
			for (let i = 0; i < newLines.length; i++) {
				if (i > 0) buffer += "\\r\\n";
				buffer += newLines[i];
			}
			buffer += "\\x1b[J"; // Clear any remainder

			if (cursorPos) {
				const moveUp = (newLines.length > 0 ? newLines.length - 1 : 0) - cursorPos.row;
				if (moveUp > 0) buffer += \`\\x1b[\${moveUp}A\`;
				buffer += \`\\r\`;
				if (cursorPos.col > 0) buffer += \`\\x1b[\${cursorPos.col}C\`;
				buffer += "\\x1b[?25h"; // Show cursor
			} else {
				buffer += "\\x1b[?25l"; // Hide cursor
			}

			if (useSync) buffer += "\\x1b[?2026l";
			this.terminal.write(buffer);

			this.previousLines = newLines;
			this.previousWidth = width;
			this.previousHeight = height;
			this.lastImeRow = cursorPos ? cursorPos.row : (newLines.length > 0 ? newLines.length - 1 : 0);
		};

		if (this.previousLines.length === 0 || widthChanged || heightChanged) {
			fullRender(this.previousLines.length !== 0 && (widthChanged || heightChanged));
			return;
		}

		const prevBottomRow = this.previousLines.length > 0 ? this.previousLines.length - 1 : 0;
		if (this.lastImeRow !== undefined && this.lastImeRow < prevBottomRow) {
			const moveDown = prevBottomRow - this.lastImeRow;
			buffer += \`\\x1b[\${moveDown}B\`;
		}
		buffer += "\\r"; // Move to column 1

		let firstChanged = 0;
		const maxLen = Math.max(this.previousLines.length, newLines.length);
		while (firstChanged < maxLen) {
			const oldL = firstChanged < this.previousLines.length ? this.previousLines[firstChanged] : undefined;
			const newL = firstChanged < newLines.length ? newLines[firstChanged] : undefined;
			if (oldL !== newL) break;
			firstChanged++;
		}

		if (firstChanged === maxLen) {
			if (cursorPos) {
				const moveUp = (newLines.length > 0 ? newLines.length - 1 : 0) - cursorPos.row;
				if (moveUp > 0) buffer += \`\\x1b[\${moveUp}A\`;
				if (cursorPos.col > 0) buffer += \`\\x1b[\${cursorPos.col}C\`;
				buffer += "\\x1b[?25h";
			} else {
				buffer += "\\x1b[?25l";
			}
			if (useSync) buffer += "\\x1b[?2026l";
			this.terminal.write(buffer);
			this.lastImeRow = cursorPos ? cursorPos.row : (newLines.length > 0 ? newLines.length - 1 : 0);
			return;
		}

		const firstVisibleChanged = Math.max(firstChanged, this.previousLines.length - height);

		const moveUp = prevBottomRow - firstVisibleChanged;
		if (moveUp > 0) {
			buffer += \`\\x1b[\${moveUp}A\`;
		}

		buffer += "\\x1b[J"; // Clear screen from cursor down

		for (let i = firstVisibleChanged; i < newLines.length; i++) {
			if (i > firstVisibleChanged) buffer += "\\r\\n";
			buffer += newLines[i];
		}

		const currentCursorRow = newLines.length > 0 ? newLines.length - 1 : 0;
		if (firstVisibleChanged >= newLines.length) {
			const diff = firstVisibleChanged - currentCursorRow;
			if (diff > 0) buffer += \`\\x1b[\${diff}A\`;
		}

		if (cursorPos) {
			const moveUpIme = currentCursorRow - cursorPos.row;
			if (moveUpIme > 0) buffer += \`\\r\\x1b[\${moveUpIme}A\`;
			else buffer += "\\r";
			if (cursorPos.col > 0) buffer += \`\\x1b[\${cursorPos.col}C\`;
			buffer += "\\x1b[?25h";
		} else {
			buffer += "\\x1b[?25l";
		}

		if (useSync) buffer += "\\x1b[?2026l";
		this.terminal.write(buffer);

		this.previousLines = newLines;
		this.previousWidth = width;
		this.previousHeight = height;
		this.lastImeRow = cursorPos ? cursorPos.row : currentCursorRow;
	}

`;

content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
fs.writeFileSync(file, content, "utf8");
console.log("Replaced doRender");
