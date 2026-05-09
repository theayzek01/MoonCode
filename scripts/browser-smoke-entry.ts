import { complete, getModel } from "hodeus-core";

const model = getModel("google", "gemini-2.5-flash");
console.log(model.id, typeof complete);
