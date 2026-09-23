/* Writes the fictional sample CSVs to sample-data/ and public/sample-data/. Run: npm run sample-data */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { generateSample } from '../src/lib/sample/generator';

const files = generateSample();
for (const dir of ['sample-data', 'public/sample-data']) {
  mkdirSync(dir, { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(path.join(dir, name), text);
}
console.log(`Wrote ${Object.keys(files).length} sample files.`);
