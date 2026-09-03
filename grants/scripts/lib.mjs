import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as parseYaml } from 'js-yaml';

export const GRANTS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

const FM = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/** Splits a markdown file into its YAML front-matter and body. */
export function parseDoc(path) {
  const raw = readFileSync(path, 'utf8');
  const match = raw.match(FM);
  if (!match) return { data: null, body: raw, path };
  return { data: parseYaml(match[1]) ?? {}, body: match[2], path };
}

/**
 * Loads every record in a grants subdirectory. `_template.md` and `README.md`
 * are scaffolding, not records, so they're skipped.
 */
export function loadDir(name) {
  const dir = join(GRANTS_DIR, name);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_') && f !== 'README.md')
    .map((f) => ({ file: basename(f), ...parseDoc(join(dir, f)) }))
    .filter((doc) => doc.data);
}

export const STAGES = [
  'prospect',
  'drafting',
  'submitted',
  'under_review',
  'awarded',
  'declined',
  'withdrawn',
  'reporting',
  'closed',
];

export const OUTCOMES = ['awarded', 'declined', 'withdrawn'];

/** Stages where a deadline still matters and the application can still be lost. */
export const OPEN_STAGES = new Set(['prospect', 'drafting', 'submitted', 'under_review']);

export const money = (n) =>
  typeof n === 'number' ? `$${n.toLocaleString('en-CA')}` : null;

/** Whole days from today to `date`; negative means the date has passed. */
export function daysUntil(date) {
  if (!date) return null;
  const then = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(then.getTime())) return null;
  const today = new Date();
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((then.getTime() - now) / 86400000);
}
