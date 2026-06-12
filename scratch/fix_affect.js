import fs from 'fs';

const filePath = 'c:/Users/ozenc/Desktop/mooncode/packages/cli/src/core/affect.ts';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace("`Etkilesim: ${state.interactionCount}`", "`Interactions: ${state.interactionCount}`");
content = content.replace("`Son sinyal: ${state.lastSignal ?? \"none\"}`", "`Last signal: ${state.lastSignal ?? \"none\"}`");
content = content.replace("`Son sinyal: ${state.lastSignal ?? \"none\"}`", "`Last signal: ${state.lastSignal ?? \"none\"}`"); // replace second occurrence too if any
content = content.replace("Not: Bu katman davranisi etkileyen kalici ic durumdur; bilinc iddiasi degildir.", "Note: This layer is a persistent internal state that influences behavior; it is not a claim of consciousness.");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed affect.ts');
