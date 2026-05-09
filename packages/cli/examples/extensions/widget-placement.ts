import type { ExtensionAPI } from "Hodeus";

export default function widgetPlacementExtension(Hodeus: ExtensionAPI) {
	Hodeus.on("session_start", (_event, ctx) => {
		if (!ctx.hasUI) return;
		ctx.ui.setWidget("widget-above", ["Above editor widget"]);
		ctx.ui.setWidget("widget-below", ["Below editor widget"], { placement: "belowEditor" });
	});
}
