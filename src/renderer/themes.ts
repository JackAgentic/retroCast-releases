import type { ThemePreset } from '../shared/types';

function generatePixelStripes(): string {
  const colors = ['%23ffb3ba', '%23ffdfba', '%23ffffba', '%23baffc9', '%23bae1ff'];
  const bandWidth = 5; // pixels per color band
  const total = colors.length * bandWidth; // 25 units across

  const rects: string[] = [];
  for (let r = 0; r < total; r++) {
    let c = 0;
    while (c < total) {
      const idx = Math.floor(((c + r) % total) / bandWidth);
      let end = c + 1;
      while (end < total && Math.floor(((end + r) % total) / bandWidth) === idx) end++;
      rects.push(`<rect x='${c}' y='${r}' width='${end - c}' height='1' fill='${colors[idx]}'/>`);
      c = end;
    }
  }

  return `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${total} ${total}' shape-rendering='crispEdges'>${rects.join('')}</svg>")`;
}

interface ThemeVars {
  '--bg-color': string;
  '--text-primary': string;
  '--text-secondary': string;
  '--accent-color': string;
  '--border-color': string;
  '--card-bg': string;
  '--header-bg': string;
  '--retro-shadow': string;
  '--body-bg': string;
  '--body-bg-pattern': string;
  '--body-bg-size'?: string;
  '--border-image'?: string;
}

const THEMES: Record<ThemePreset, ThemeVars> = {
  'classic-white': {
    '--bg-color': '#ffffff',
    '--text-primary': '#000000',
    '--text-secondary': '#000000',
    '--accent-color': '#000000',
    '--border-color': '#000000',
    '--card-bg': '#ffffff',
    '--header-bg': '#ffffff',
    '--retro-shadow': '4px 4px 0px #000',
    '--body-bg': '#efefef',
    '--body-bg-pattern': [
      'linear-gradient(45deg, #e5e5e5 25%, transparent 25%)',
      'linear-gradient(-45deg, #e5e5e5 25%, transparent 25%)',
      'linear-gradient(45deg, transparent 75%, #e5e5e5 75%)',
      'linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)',
    ].join(', '),
  },
  'terminal-green': {
    '--bg-color': '#0a0a0a',
    '--text-primary': '#00ff00',
    '--text-secondary': '#00cc00',
    '--accent-color': '#00ff00',
    '--border-color': '#00ff00',
    '--card-bg': '#0a0a0a',
    '--header-bg': '#0a0a0a',
    '--retro-shadow': '4px 4px 0px #005500',
    '--body-bg': '#000000',
    '--body-bg-pattern': [
      'linear-gradient(45deg, #0a1a0a 25%, transparent 25%)',
      'linear-gradient(-45deg, #0a1a0a 25%, transparent 25%)',
      'linear-gradient(45deg, transparent 75%, #0a1a0a 75%)',
      'linear-gradient(-45deg, transparent 75%, #0a1a0a 75%)',
    ].join(', '),
  },
  'cyberpunk-amber': {
    '--bg-color': '#1a1000',
    '--text-primary': '#ffaa00',
    '--text-secondary': '#cc8800',
    '--accent-color': '#ffaa00',
    '--border-color': '#ffaa00',
    '--card-bg': '#1a1000',
    '--header-bg': '#1a1000',
    '--retro-shadow': '4px 4px 0px #553300',
    '--body-bg': '#0a0800',
    '--body-bg-pattern': [
      'linear-gradient(45deg, #1a1200 25%, transparent 25%)',
      'linear-gradient(-45deg, #1a1200 25%, transparent 25%)',
      'linear-gradient(45deg, transparent 75%, #1a1200 75%)',
      'linear-gradient(-45deg, transparent 75%, #1a1200 75%)',
    ].join(', '),
  },
  'synthwave-magenta': {
    '--bg-color': '#0f0518',
    '--text-primary': '#ff00ff',
    '--text-secondary': '#d000d0',
    '--accent-color': '#ff00ff',
    '--border-color': '#ff00ff',
    '--card-bg': '#0f0518',
    '--header-bg': '#0f0518',
    '--retro-shadow': '4px 4px 0px #500050',
    '--body-bg': '#080010',
    '--body-bg-pattern': [
      'linear-gradient(45deg, #180528 25%, transparent 25%)',
      'linear-gradient(-45deg, #180528 25%, transparent 25%)',
      'linear-gradient(45deg, transparent 75%, #180528 75%)',
      'linear-gradient(-45deg, transparent 75%, #180528 75%)',
    ].join(', '),
  },
  'neon-cycle': {
    '--bg-color': '#050505',
    '--text-primary': '#ffffff',
    '--text-secondary': '#aaaaaa',
    '--accent-color': '#ff0000',
    '--border-color': '#ff0000',
    '--card-bg': '#0a0a0a',
    '--header-bg': '#0a0a0a',
    '--retro-shadow': '0 0 8px #ff0000, 4px 4px 0px #330000',
    '--body-bg': '#050505',
    '--body-bg-pattern': 'none',
  },
  'rainbow-arcade': {
    '--bg-color': '#ffffff',
    '--text-primary': '#000000',
    '--text-secondary': '#333333',
    '--accent-color': '#ff00ff',
    '--border-color': '#000000',
    '--card-bg': '#ffffff',
    '--header-bg': '#ffffff',
    '--retro-shadow': '4px 4px 0px #888',
    '--body-bg': '#ffffff',
    '--body-bg-pattern': generatePixelStripes(),
    '--body-bg-size': '200px 200px',
    '--border-image': [
      'conic-gradient(from 0deg,',
      '#ff0000 0deg, #ff0000 51deg,',
      '#ff7f00 51deg, #ff7f00 103deg,',
      '#ffff00 103deg, #ffff00 154deg,',
      '#00cc00 154deg, #00cc00 206deg,',
      '#0000ff 206deg, #0000ff 257deg,',
      '#8b00ff 257deg, #8b00ff 309deg,',
      '#ff0000 309deg, #ff0000 360deg)',
      '1',
    ].join(' '),
  },
};

let neonInterval: ReturnType<typeof setInterval> | null = null;

const NEON_COLORS = [
  { color: '#ff0055', shadow: '#330011', glow: '#ff0055' },
  { color: '#ff6600', shadow: '#331a00', glow: '#ff6600' },
  { color: '#ffee00', shadow: '#333000', glow: '#ffee00' },
  { color: '#00ff66', shadow: '#003318', glow: '#00ff66' },
  { color: '#00ccff', shadow: '#003040', glow: '#00ccff' },
  { color: '#6633ff', shadow: '#1a0d40', glow: '#6633ff' },
  { color: '#ff00ff', shadow: '#330033', glow: '#ff00ff' },
];

function startNeonCycle() {
  if (neonInterval) return;
  let idx = 0;
  const root = document.documentElement;

  const tick = () => {
    const c = NEON_COLORS[idx % NEON_COLORS.length];
    root.style.setProperty('--border-color', c.color);
    root.style.setProperty('--accent-color', c.color);
    root.style.setProperty('--text-primary', c.color);
    root.style.setProperty('--text-secondary', c.color);
    root.style.setProperty('--retro-shadow', `0 0 8px ${c.glow}, 4px 4px 0px ${c.shadow}`);
    idx++;
  };

  tick();
  neonInterval = setInterval(tick, 6000);
}

function stopNeonCycle() {
  if (neonInterval) {
    clearInterval(neonInterval);
    neonInterval = null;
  }
}

export function applyTheme(preset: ThemePreset): void {
  stopNeonCycle();

  const vars = THEMES[preset];
  if (!vars) return;
  const root = document.documentElement;

  document.body.style.backgroundSize = vars['--body-bg-size'] || '4px 4px';

  // Clear border-image if not set by this theme
  root.style.setProperty('--border-image', vars['--border-image'] || 'none');

  for (const [key, value] of Object.entries(vars)) {
    if (key === '--body-bg') {
      document.body.style.backgroundColor = value as string;
    } else if (key === '--body-bg-pattern') {
      document.body.style.backgroundImage = value as string;
    } else if (key !== '--body-bg-size' && key !== '--border-image') {
      root.style.setProperty(key, value as string);
    }
  }

  if (preset === 'neon-cycle') {
    root.style.setProperty('transition', '--border-color 4.8s ease, --text-primary 4.8s ease, --text-secondary 4.8s ease, --accent-color 4.8s ease');
    startNeonCycle();
  } else {
    root.style.setProperty('transition', 'none');
  }
}
