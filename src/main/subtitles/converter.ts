import { parseSync, stringifySync } from 'subtitle';
import fs from 'node:fs';

export function convertSrtToVtt(srtPath: string): string {
  const srtContent = fs.readFileSync(srtPath, 'utf-8');
  const nodes = parseSync(srtContent);
  return stringifySync(nodes, { format: 'WebVTT' });
}
