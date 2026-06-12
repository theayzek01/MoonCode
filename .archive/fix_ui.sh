#!/bin/bash
sed -i "s/if(id === 'modelModal') loadModels();/if(id === 'modelModal') loadModels();\n\t\tif(id === 'settingsModal') loadSettings();/" packages/cli/src/modes/web/web-ui.html

cat << 'INNER_EOF' >> packages/cli/src/modes/web/web-ui.html
<script>
async function loadSettings() {
	try {
		const res = await fetch('/api/settings');
		const settings = await res.json();
		const c = document.getElementById('settingsContainer');
		c.innerHTML = `
			<div class="flex flex-col gap-1">
				<label class="text-textPrimary">Theme</label>
				<select id="set-theme" class="bg-black/30 border border-border p-2 rounded text-textPrimary outline-none">
					<option value="sea-dark" ${settings.theme === 'sea-dark' ? 'selected' : ''}>Sea Dark</option>
					<option value="dracula" ${settings.theme === 'dracula' ? 'selected' : ''}>Dracula</option>
				</select>
			</div>
			<div class="flex flex-col gap-1 mt-3">
				<label class="text-textPrimary">Profile</label>
				<select id="set-profile" class="bg-black/30 border border-border p-2 rounded text-textPrimary outline-none">
					<option value="coder" ${settings.profile === 'coder' ? 'selected' : ''}>Coder</option>
					<option value="conservative" ${settings.profile === 'conservative' ? 'selected' : ''}>Conservative</option>
				</select>
			</div>
			<div class="flex flex-col gap-1 mt-3">
				<label class="flex items-center gap-2 cursor-pointer text-textPrimary">
					<input type="checkbox" id="set-tool-compaction" class="rounded bg-black/30 border-border" ${settings.enableToolBasedCompaction ? 'checked' : ''}>
					Enable Tool-based Compaction
				</label>
			</div>
		`;
	} catch(e) {
		document.getElementById('settingsContainer').innerHTML = '<div class="text-red-400">Error loading settings</div>';
	}
}

async function saveSettings() {
	const theme = document.getElementById('set-theme')?.value;
	const profile = document.getElementById('set-profile')?.value;
	const toolCompaction = document.getElementById('set-tool-compaction')?.checked;

	const updates = {};
	if(theme !== undefined) updates.theme = theme;
	if(profile !== undefined) updates.profile = profile;
	if(toolCompaction !== undefined) updates.enableToolBasedCompaction = toolCompaction;

	try {
		await fetch('/api/settings', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(updates)
		});
		closeModal();
	} catch(e) {
		alert('Error saving settings');
	}
}
</script>
INNER_EOF
