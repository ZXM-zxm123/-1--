export type BubbleColor = 0 | 1 | 2 | 3 | 4 | 5;
export type BubbleType = 'normal' | 'ice' | 'reflect' | 'explosive' | 'colorful';
export type GameState = 'menu' | 'playing' | 'paused' | 'levelComplete' | 'gameOver';
export type ThemeType = 'classic' | 'dark' | 'candy';

export interface Bubble {
  id: number;
  row: number;
  col: number;
  x: number;
  y: number;
  color: BubbleColor;
  type: BubbleType;
  iceHits: number;
  radius: number;
  vx: number;
  vy: number;
  active: boolean;
  falling: boolean;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: BubbleColor;
  type: BubbleType;
  radius: number;
  active: boolean;
  bounces: number;
  maxBounces: number;
}

export interface LevelConfig {
  level: number;
  rows: number;
  targetScore: number;
  initialShots: number;
  iceRatio: number;
  reflectRatio: number;
  explosiveRatio: number;
  colorfulRatio: number;
  colors: BubbleColor[];
}

export interface GameProgress {
  currentLevel: number;
  highScore: number;
  totalScore: number;
  theme: ThemeType;
}

export interface Theme {
  name: string;
  bgPrimary: string;
  bgSecondary: string;
  accent: string;
  bubbleColors: string[];
  launcherColor: string;
  uiColor: string;
}

export const THEMES: Record<ThemeType, Theme> = {
  classic: {
    name: '经典',
    bgPrimary: '#1a1a2e',
    bgSecondary: '#16213e',
    accent: '#4facfe',
    bubbleColors: ['#ff6b6b', '#4facfe', '#43e97b', '#f9ca24', '#a55eea', '#fd79a8'],
    launcherColor: '#4facfe',
    uiColor: '#ffffff'
  },
  dark: {
    name: '暗夜',
    bgPrimary: '#0d0d0d',
    bgSecondary: '#1a1a1a',
    accent: '#ff6b6b',
    bubbleColors: ['#ff4757', '#2f3542', '#ffa502', '#7bed9f', '#a55eea', '#70a1ff'],
    launcherColor: '#ff6b6b',
    uiColor: '#e0e0e0'
  },
  candy: {
    name: '糖果',
    bgPrimary: '#2d1b4e',
    bgSecondary: '#4a2c7a',
    accent: '#ff69b4',
    bubbleColors: ['#ff69b4', '#87ceeb', '#98fb98', '#ffd700', '#da70d6', '#ffb6c1'],
    launcherColor: '#ff69b4',
    uiColor: '#fff0f5'
  }
};

export const LEVEL_CONFIGS: LevelConfig[] = [
  { level: 1, rows: 6, targetScore: 500, initialShots: 30, iceRatio: 0, reflectRatio: 0, explosiveRatio: 0, colorfulRatio: 0, colors: [0, 1, 2] },
  { level: 2, rows: 6, targetScore: 1000, initialShots: 28, iceRatio: 0.1, reflectRatio: 0, explosiveRatio: 0, colorfulRatio: 0, colors: [0, 1, 2, 3] },
  { level: 3, rows: 7, targetScore: 1800, initialShots: 26, iceRatio: 0.15, reflectRatio: 0.05, explosiveRatio: 0, colorfulRatio: 0, colors: [0, 1, 2, 3] },
  { level: 4, rows: 7, targetScore: 2800, initialShots: 24, iceRatio: 0.2, reflectRatio: 0.08, explosiveRatio: 0.05, colorfulRatio: 0, colors: [0, 1, 2, 3, 4] },
  { level: 5, rows: 8, targetScore: 4000, initialShots: 22, iceRatio: 0.2, reflectRatio: 0.1, explosiveRatio: 0.08, colorfulRatio: 0.05, colors: [0, 1, 2, 3, 4, 5] },
  { level: 6, rows: 8, targetScore: 5500, initialShots: 20, iceRatio: 0.25, reflectRatio: 0.1, explosiveRatio: 0.1, colorfulRatio: 0.08, colors: [0, 1, 2, 3, 4, 5] },
  { level: 7, rows: 9, targetScore: 7500, initialShots: 18, iceRatio: 0.3, reflectRatio: 0.12, explosiveRatio: 0.1, colorfulRatio: 0.1, colors: [0, 1, 2, 3, 4, 5] },
];