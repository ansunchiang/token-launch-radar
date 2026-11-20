import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { buildRadar, parseSnapshot, validateBoard } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const args = process.argv.slice(2);
const dossierCaps = {
  text_max_bytes: 65_536,
  screenshots: { max: 4, max_bytes: 524_288 },
  dashboard: { max_files: 400, max_bytes: 4_194_304 },
};
function option(name: string): string | undefined {
  const index = args.indexOf(name);
  if (index !== -1) {
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${name} requires a path`);
    return value;
  }
  return args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
}

function run() {
  const input = option('--input') ?? process.env.MAKEFUN_INPUT_PATH ?? '/input/snapshot.json';
  const snapshotPath = input.endsWith('.json') ? input : join(input, 'snapshot.json');
  const output = resolve(option('--output') ?? process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
  const snapshot = parseSnapshot(readFileSync(snapshotPath, 'utf8'));
  const radar = buildRadar(snapshot);
  validateBoard(radar);

  const root = import.meta.dirname;
  if (output === root) throw new Error('Choose an output directory outside the source root');
  const images = readdirSync(join(root, 'screenshots')).filter((name) => !name.startsWith('.'));
  if (images.length < 3 || images.length > 4) throw new Error('Expected three or four screenshots');

  mkdirSync(output, { recursive: true });
  for (const directory of ['dashboard', 'screenshots']) {
    cpSync(join(root, directory), join(output, directory), {
      recursive: true,
      filter: (path) => !basename(path).startsWith('.'),
    });
  }
  const board = { as_of: radar.as_of, model: 'peer-multiples', rows: radar.rows };
  writeFileSync(join(output, 'board.json'), JSON.stringify(board) + '\n');
  // A sibling script also works from file://, without fetch or a web server.
  writeFileSync(join(output, 'data.js'), `window.RADAR = ${JSON.stringify(radar)};\n`);
  const dossier = buildDossier(output, dossierCaps);
  if (dossier.length > 1_572_864) throw new Error('Dossier exceeds 1.5 MiB');
  writeFileSync(join(output, 'dossier.json'), dossier);
  process.stdout.write(`Wrote ${radar.rows.length} ranks and ${radar.watchlist_size} watchlist entries to ${output}.\n`);
}

try {
  run();
} catch (error) {
  process.stderr.write(`Token Launch Radar: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
