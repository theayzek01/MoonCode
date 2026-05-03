import { complete, getModel } from "@moodcli/core";

const model = getModel("google", "gemini-2.5-flash");
console.log(model.id, typeof complete);
