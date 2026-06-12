with open("packages/cli/src/modes/web/web-mode.ts", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "div.innerHTML = `" in line and lines[i+2].find("escapeHtml(text)") != -1:
        lines[i] = line.replace("`", "\`")
        lines[i+2] = lines[i+2].replace("${escapeHtml(text)}", "\${escapeHtml(text)}")
        lines[i+4] = lines[i+4].replace("`", "\`")

with open("packages/cli/src/modes/web/web-mode.ts", "w") as f:
    f.writelines(lines)
