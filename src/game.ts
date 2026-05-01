import { Bubble, Projectile, BubbleColor, BubbleType, GameState, ThemeType, THEMES, LEVEL_CONFIGS } from './types';

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  
  width: number;
  height: number;
  bubbleRadius: number = 20;
  gridCols: number = 10;
  gridRows: number = 8;
  gridOffsetX: number;
  gridOffsetY: number = 60;
  
  bubbles: Bubble[] = [];
  projectile: Projectile | null = null;
  shootingBubble: Bubble | null = null;
  
  launcherX: number;
  launcherY: number;
  aimAngle: number = -Math.PI / 2;
  mouseX: number = 0;
  mouseY: number = 0;
  
  state: GameState = 'menu';
  currentLevel: number = 1;
  shotsLeft: number = 30;
  score: number = 0;
  combo: number = 0;
  lastEliminationTime: number = 0;
  
  theme: ThemeType = 'classic';
  nextBubbleColor: BubbleColor = 0;
  nextBubbleType: BubbleType = 'normal';
  
  private bubbleIdCounter: number = 0;
  private projectileIdCounter: number = 0;
  private lastTime: number = 0;
  private animationId: number = 0;
  
  private levelConfig = LEVEL_CONFIGS[0];
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = 460;
    this.height = 640;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.launcherX = this.width / 2;
    this.launcherY = this.height - 50;
    this.gridOffsetX = (this.width - this.gridCols * this.bubbleRadius * 2) / 2 + this.bubbleRadius;
    
    this.setupEventListeners();
    this.loadProgress();
  }
  
  private setupEventListeners(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
      if (this.state === 'playing' && !this.projectile && !this.shootingBubble) {
        this.aimAngle = Math.atan2(this.launcherY - this.mouseY, this.mouseX - this.launcherX);
        this.aimAngle = Math.max(-Math.PI + 0.3, Math.min(-0.3, this.aimAngle));
      }
    });
    
    this.canvas.addEventListener('click', () => {
      if (this.state === 'menu') {
        this.startGame();
      } else if (this.state === 'playing' && !this.projectile && !this.shootingBubble) {
        this.shoot();
      } else if (this.state === 'levelComplete') {
        this.nextLevel();
      } else if (this.state === 'gameOver') {
        this.startGame();
      }
    });
    
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (this.state === 'playing') {
        this.swapBubbles();
      }
    });
  }
  
  private loadProgress(): void {
    try {
      const saved = localStorage.getItem('bubbleShooterProgress');
      if (saved) {
        const data = JSON.parse(saved);
        this.currentLevel = data.currentLevel || 1;
        this.theme = data.theme || 'classic';
      }
    } catch {
      this.currentLevel = 1;
      this.theme = 'classic';
    }
    this.applyTheme();
  }
  
  private saveProgress(): void {
    try {
      const data = {
        currentLevel: this.currentLevel,
        highScore: Math.max(this.score, this.getHighScore()),
        totalScore: this.score,
        theme: this.theme
      };
      localStorage.setItem('bubbleShooterProgress', JSON.stringify(data));
    } catch {}
  }
  
  private getHighScore(): number {
    try {
      const saved = localStorage.getItem('bubbleShooterProgress');
      if (saved) {
        return JSON.parse(saved).highScore || 0;
      }
    } catch {}
    return 0;
  }
  
  private applyTheme(): void {
    document.body.className = `theme-${this.theme}`;
  }
  
  private setTheme(theme: ThemeType): void {
    this.theme = theme;
    this.applyTheme();
    this.saveProgress();
  }
  
  private startGame(): void {
    this.state = 'playing';
    this.score = 0;
    this.combo = 0;
    this.initLevel();
    this.gameLoop();
  }
  
  private initLevel(): void {
    this.levelConfig = LEVEL_CONFIGS[Math.min(this.currentLevel - 1, LEVEL_CONFIGS.length - 1)];
    this.gridRows = this.levelConfig.rows;
    this.shotsLeft = this.levelConfig.initialShots;
    this.bubbles = [];
    this.projectile = null;
    this.shootingBubble = null;
    this.bubbleIdCounter = 0;
    this.projectileIdCounter = 0;
    
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        if (row % 2 === 1 && col >= this.gridCols - 1) continue;
        
        const pos = this.gridToPixel(row, col);
        const rand = Math.random();
        let type: BubbleType = 'normal';
        let iceHits = 0;
        
        if (rand < this.levelConfig.iceRatio) {
          type = 'ice';
          iceHits = 2;
        } else if (rand < this.levelConfig.iceRatio + this.levelConfig.reflectRatio) {
          type = 'reflect';
        } else if (rand < this.levelConfig.iceRatio + this.levelConfig.reflectRatio + this.levelConfig.explosiveRatio) {
          type = 'explosive';
        } else if (rand < this.levelConfig.iceRatio + this.levelConfig.reflectRatio + this.levelConfig.explosiveRatio + this.levelConfig.colorfulRatio) {
          type = 'colorful';
        }
        
        this.bubbles.push({
          id: this.bubbleIdCounter++,
          row, col,
          x: pos.x, y: pos.y,
          color: this.levelConfig.colors[Math.floor(Math.random() * this.levelConfig.colors.length)],
          type,
          iceHits,
          radius: this.bubbleRadius,
          vx: 0, vy: 0,
          active: true,
          falling: false
        });
      }
    }
    
    this.prepareNextBubble();
  }
  
  private gridToPixel(row: number, col: number): { x: number, y: number } {
    const offset = row % 2 === 1 ? this.bubbleRadius : 0;
    return {
      x: this.gridOffsetX + col * this.bubbleRadius * 2 + offset,
      y: this.gridOffsetY + row * this.bubbleRadius * 1.73
    };
  }
  
  private pixelToGrid(x: number, y: number): { row: number, col: number } {
    const row = Math.round((y - this.gridOffsetY) / (this.bubbleRadius * 1.73));
    const offset = row % 2 === 1 ? this.bubbleRadius : 0;
    const col = Math.round((x - this.gridOffsetX - offset) / (this.bubbleRadius * 2));
    return { row: Math.max(0, row), col: Math.max(0, Math.min(col, this.gridCols - 1)) };
  }
  
  private prepareNextBubble(): void {
    const rand = Math.random();
    if (rand < 0.1) {
      this.nextBubbleType = 'reflect';
    } else if (rand < 0.18) {
      this.nextBubbleType = 'explosive';
    } else if (rand < 0.25) {
      this.nextBubbleType = 'colorful';
    } else {
      this.nextBubbleType = 'normal';
    }
    this.nextBubbleColor = this.levelConfig.colors[Math.floor(Math.random() * this.levelConfig.colors.length)];
  }
  
  private swapBubbles(): void {
    if (this.shootingBubble) {
      const colors = this.levelConfig.colors;
      const currentIdx = colors.indexOf(this.nextBubbleColor);
      const nextIdx = (currentIdx + 1) % colors.length;
      this.nextBubbleColor = colors[nextIdx];
    }
  }
  
  private shoot(): void {
    if (this.shotsLeft <= 0) return;
    
    this.shotsLeft--;
    const speed = 15;
    this.projectile = {
      id: this.projectileIdCounter++,
      x: this.launcherX,
      y: this.launcherY,
      vx: Math.cos(this.aimAngle) * speed,
      vy: Math.sin(this.aimAngle) * speed,
      color: this.nextBubbleColor,
      type: this.nextBubbleType,
      radius: this.bubbleRadius,
      active: true,
      bounces: 0,
      maxBounces: this.nextBubbleType === 'reflect' ? 5 : 0
    };
    this.shootingBubble = null;
    this.prepareNextBubble();
  }
  
  private updateProjectile(dt: number): void {
    if (!this.projectile || !this.projectile.active) return;
    
    const p = this.projectile;
    p.x += p.vx;
    p.y += p.vy;
    
    if (p.x - p.radius <= 0 || p.x + p.radius >= this.width) {
      p.vx *= -1;
      p.x = Math.max(p.radius, Math.min(this.width - p.radius, p.x));
      p.bounces++;
    }
    
    if (p.y - p.radius <= this.gridOffsetY) {
      p.y = this.gridOffsetY + p.radius;
      this.attachBubble(p);
      return;
    }
    
    if (p.bounces > p.maxBounces) {
      p.bounces = 0;
    }
    
    for (const bubble of this.bubbles) {
      if (!bubble.active || bubble.falling) continue;
      if (this.checkCollision(p, bubble)) {
        this.attachBubble(p);
        return;
      }
    }
    
    if (p.y - p.radius > this.launcherY + 50) {
      this.projectile = null;
    }
  }
  
  private checkCollision(p: Projectile, b: Bubble): boolean {
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < p.radius + b.radius - 2;
  }
  
  private attachBubble(p: Projectile): void {
    const grid = this.pixelToGrid(p.x, p.y);
    let row = grid.row;
    let col = grid.col;
    
    const offset = row % 2 === 1 ? this.bubbleRadius : 0;
    const actualCol = Math.min(col, this.gridCols - 1 - (row % 2 === 1 ? 1 : 0));
    
    const existingIdx = this.bubbles.findIndex(b => b.row === row && b.col === actualCol && b.active);
    if (existingIdx !== -1) {
      row = this.findNearestEmptySlot(p.x, p.y).row;
      col = this.findNearestEmptySlot(p.x, p.y).col;
    }
    
    if (row >= 0) {
      const pos = this.gridToPixel(row, col);
      const newBubble: Bubble = {
        id: this.bubbleIdCounter++,
        row, col,
        x: pos.x, y: pos.y,
        color: p.color,
        type: p.type,
        iceHits: p.type === 'ice' ? 2 : 0,
        radius: this.bubbleRadius,
        vx: 0, vy: 0,
        active: true,
        falling: false
      };
      this.bubbles.push(newBubble);
      this.projectile = null;
      
      this.processMatches(newBubble);
    } else {
      this.projectile = null;
    }
  }
  
  private findNearestEmptySlot(x: number, y: number): { row: number, col: number } {
    const grid = this.pixelToGrid(x, y);
    let { row, col } = grid;
    
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = row + dr;
        const c = col + dc;
        const hasBubble = this.bubbles.some(b => b.row === r && b.col === c && b.active);
        if (!hasBubble && r >= 0 && c >= 0) {
          const maxCol = this.gridCols - 1 - (r % 2 === 1 ? 1 : 0);
          if (c <= maxCol) {
            return { row: r, col: c };
          }
        }
      }
    }
    return { row, col };
  }
  
  private processMatches(newBubble: Bubble): void {
    const sameColor = this.bubbles.filter(b => 
      b.active && !b.falling && b.color === newBubble.color && b.id !== newBubble.id
    );
    
    const connected = this.findConnected(newBubble);
    const matchGroup = connected.filter(b => sameColor.some(sc => sc.id === b.id));
    
    if (matchGroup.length >= 3) {
      this.combo++;
      const now = Date.now();
      if (now - this.lastEliminationTime < 1000) {
        this.combo++;
      }
      this.lastEliminationTime = now;
      
      const baseScore = matchGroup.length * 10 * this.combo;
      const comboBonus = (this.combo - 1) * 50;
      this.score += baseScore + comboBonus;
      
      for (const b of matchGroup) {
        this.handleBubbleElimination(b);
      }
      
      this.checkFallingBubbles();
      this.checkLevelComplete();
    } else {
      this.combo = 0;
    }
  }
  
  private handleBubbleElimination(bubble: Bubble): void {
    if (bubble.type === 'explosive') {
      this.explodeArea(bubble);
    }
    bubble.active = false;
  }
  
  private explodeArea(bubble: Bubble): void {
    const radius = this.bubbleRadius * 3;
    for (const b of this.bubbles) {
      if (!b.active) continue;
      const dx = b.x - bubble.x;
      const dy = b.y - bubble.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius) {
        b.active = false;
        this.score += 15;
      }
    }
  }
  
  private findConnected(start: Bubble): Bubble[] {
    const visited = new Set<number>();
    const result: Bubble[] = [];
    const queue: Bubble[] = [start];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      result.push(current);
      
      const neighbors = this.getNeighbors(current);
      for (const n of neighbors) {
        if (!visited.has(n.id) && n.active && !n.falling) {
          queue.push(n);
        }
      }
    }
    
    return result;
  }
  
  private getNeighbors(bubble: Bubble): Bubble[] {
    const neighbors: Bubble[] = [];
    const { row, col } = bubble;
    const isOddRow = row % 2 === 1;
    
    const offsets = isOddRow ? [
      [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, 0], [1, 1]
    ] : [
      [-1, -1], [-1, 0],
      [0, -1], [0, 1],
      [1, -1], [1, 0]
    ];
    
    for (const [dr, dc] of offsets) {
      const r = row + dr;
      const c = col + dc;
      const maxCol = this.gridCols - 1 - (r % 2 === 1 ? 1 : 0);
      if (r >= 0 && c >= 0 && c <= maxCol) {
        const found = this.bubbles.find(b => b.row === r && b.col === c && b.active && !b.falling);
        if (found) neighbors.push(found);
      }
    }
    
    return neighbors;
  }
  
  private checkFallingBubbles(): void {
    const activeBubbles = this.bubbles.filter(b => b.active && !b.falling);
    if (activeBubbles.length === 0) return;
    
    const topRow = Math.min(...activeBubbles.map(b => b.row));
    const topBubbles = activeBubbles.filter(b => b.row === topRow);
    
    const connectedToTop = new Set<number>();
    const queue = [...topBubbles];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (connectedToTop.has(current.id)) continue;
      connectedToTop.add(current.id);
      
      const neighbors = this.getNeighbors(current);
      for (const n of neighbors) {
        if (!connectedToTop.has(n.id) && n.active && !n.falling) {
          queue.push(n);
        }
      }
    }
    
    for (const b of activeBubbles) {
      if (!connectedToTop.has(b.id)) {
        b.falling = true;
        b.vy = 0;
        this.score += 20;
      }
    }
  }
  
  private checkLevelComplete(): void {
    const activeBubbles = this.bubbles.filter(b => b.active);
    if (activeBubbles.length === 0) {
      this.state = 'levelComplete';
      this.saveProgress();
    } else if (this.shotsLeft <= 0) {
      this.state = 'gameOver';
      this.saveProgress();
    }
  }
  
  private nextLevel(): void {
    this.currentLevel++;
    if (this.currentLevel > LEVEL_CONFIGS.length) {
      this.currentLevel = 1;
    }
    this.state = 'playing';
    this.initLevel();
  }
  
  private updateFallingBubbles(dt: number): void {
    for (const bubble of this.bubbles) {
      if (!bubble.falling) continue;
      
      bubble.vy += 0.5;
      bubble.y += bubble.vy;
      bubble.x += bubble.vx;
      
      if (bubble.y > this.height + bubble.radius) {
        bubble.active = false;
      }
    }
  }
  
  private update(dt: number): void {
    if (this.state !== 'playing') return;
    
    this.updateProjectile(dt);
    this.updateFallingBubbles(dt);
  }
  
  private render(): void {
    const theme = THEMES[this.theme];
    
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, theme.bgPrimary);
    gradient.addColorStop(1, theme.bgSecondary);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
    this.ctx.fillRect(0, 0, this.width, this.gridOffsetY - 10);
    
    for (const bubble of this.bubbles) {
      if (!bubble.active) continue;
      this.drawBubble(bubble, theme);
    }
    
    if (this.projectile && this.projectile.active) {
      this.drawProjectile(this.projectile, theme);
    }
    
    this.drawLauncher(theme);
    this.drawUI(theme);
  }
  
  private drawBubble(bubble: Bubble, theme: typeof THEMES.classic): void {
    const { x, y, color, type, iceHits, radius } = bubble;
    
    if (type === 'colorful') {
      const time = Date.now() / 200;
      const idx = Math.floor(time) % 6;
      const nextIdx = (idx + 1) % 6;
      const t = (time % 1);
      const r = Math.round(255 * t);
      const g = Math.round(255 * (1 - t));
      this.ctx.fillStyle = `rgb(${r},${g},${Math.floor(255/2)})`;
    } else {
      this.ctx.fillStyle = theme.bubbleColors[color];
    }
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    this.ctx.stroke();
    
    if (type === 'ice') {
      this.ctx.strokeStyle = 'rgba(200,230,255,0.8)';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
      this.ctx.stroke();
      
      if (iceHits === 2) {
        this.ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x - radius * 0.5, y - radius * 0.5);
        this.ctx.lineTo(x + radius * 0.5, y + radius * 0.5);
        this.ctx.moveTo(x + radius * 0.5, y - radius * 0.5);
        this.ctx.lineTo(x - radius * 0.5, y + radius * 0.5);
        this.ctx.stroke();
      }
    }
    
    if (type === 'reflect') {
      this.ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x - radius * 0.5, y);
      this.ctx.lineTo(x + radius * 0.5, y);
      this.ctx.moveTo(x, y - radius * 0.5);
      this.ctx.lineTo(x, y + radius * 0.5);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(x - radius * 0.35, y - radius * 0.35);
      this.ctx.lineTo(x + radius * 0.35, y + radius * 0.35);
      this.ctx.stroke();
    }
    
    if (type === 'explosive') {
      this.ctx.strokeStyle = '#ff0';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const innerR = radius * 0.5;
        const outerR = radius * 0.9;
        this.ctx.moveTo(x + Math.cos(angle) * innerR, y + Math.sin(angle) * innerR);
        this.ctx.lineTo(x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR);
      }
      this.ctx.stroke();
    }
  }
  
  private drawProjectile(p: Projectile, theme: typeof THEMES.classic): void {
    this.ctx.fillStyle = theme.bubbleColors[p.color];
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(p.x - p.radius * 0.3, p.y - p.radius * 0.3, p.radius * 0.3, 0, Math.PI * 2);
    this.ctx.stroke();
    
    if (p.type === 'reflect') {
      this.ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(p.x - p.radius * 0.4, p.y);
      this.ctx.lineTo(p.x + p.radius * 0.4, p.y);
      this.ctx.stroke();
    }
    
    if (p.type === 'explosive') {
      this.ctx.strokeStyle = '#ff0';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const outerR = p.radius * 0.9;
        this.ctx.moveTo(p.x + Math.cos(angle) * p.radius * 0.5, p.y + Math.sin(angle) * p.radius * 0.5);
        this.ctx.lineTo(p.x + Math.cos(angle) * outerR, p.y + Math.sin(angle) * outerR);
      }
      this.ctx.stroke();
    }
  }
  
  private drawLauncher(theme: typeof THEMES.classic): void {
    this.ctx.fillStyle = theme.launcherColor;
    this.ctx.beginPath();
    this.ctx.arc(this.launcherX, this.launcherY, 35, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.fillStyle = 'rgba(0,0,0,0.4)';
    this.ctx.beginPath();
    this.ctx.arc(this.launcherX, this.launcherY, 28, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.save();
    this.ctx.translate(this.launcherX, this.launcherY);
    this.ctx.rotate(this.aimAngle);
    this.ctx.fillStyle = theme.launcherColor;
    this.ctx.fillRect(0, -6, 45, 12);
    this.ctx.restore();
    
    this.ctx.fillStyle = theme.bubbleColors[this.nextBubbleColor];
    this.ctx.beginPath();
    this.ctx.arc(this.launcherX, this.launcherY, this.bubbleRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(this.launcherX - this.bubbleRadius * 0.3, this.launcherY - this.bubbleRadius * 0.3, this.bubbleRadius * 0.3, 0, Math.PI * 2);
    this.ctx.stroke();
  }
  
  private drawUI(theme: typeof THEMES.classic): void {
    this.ctx.fillStyle = theme.uiColor;
    this.ctx.font = 'bold 18px Segoe UI';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`关卡: ${this.currentLevel}`, 10, 25);
    this.ctx.fillText(`剩余: ${this.shotsLeft}`, 10, 48);
    this.ctx.fillText(`得分: ${this.score}`, 120, 25);
    this.ctx.fillText(`连击: x${this.combo}`, 120, 48);
    
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`目标: ${this.levelConfig.targetScore}`, this.width - 10, 25);
    
    this.ctx.textAlign = 'center';
    if (this.state === 'menu') {
      this.ctx.font = 'bold 36px Segoe UI';
      this.ctx.fillText('泡泡龙三消', this.width / 2, this.height / 2 - 60);
      this.ctx.font = '20px Segoe UI';
      this.ctx.fillText(`最高分: ${this.getHighScore()}`, this.width / 2, this.height / 2 - 20);
      this.ctx.fillText('点击开始游戏', this.width / 2, this.height / 2 + 30);
      this.ctx.font = '16px Segoe UI';
      this.ctx.fillText('右键切换颜色 | 鼠标瞄准', this.width / 2, this.height / 2 + 70);
      this.drawThemeButtons(theme);
    } else if (this.state === 'levelComplete') {
      this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.fillStyle = '#43e97b';
      this.ctx.font = 'bold 36px Segoe UI';
      this.ctx.fillText('过关!', this.width / 2, this.height / 2 - 40);
      this.ctx.fillStyle = theme.uiColor;
      this.ctx.font = '24px Segoe UI';
      this.ctx.fillText(`得分: ${this.score}`, this.width / 2, this.height / 2 + 10);
      this.ctx.font = '20px Segoe UI';
      this.ctx.fillText('点击进入下一关', this.width / 2, this.height / 2 + 60);
    } else if (this.state === 'gameOver') {
      this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.fillStyle = '#ff6b6b';
      this.ctx.font = 'bold 36px Segoe UI';
      this.ctx.fillText('游戏结束', this.width / 2, this.height / 2 - 40);
      this.ctx.fillStyle = theme.uiColor;
      this.ctx.font = '24px Segoe UI';
      this.ctx.fillText(`得分: ${this.score}`, this.width / 2, this.height / 2 + 10);
      this.ctx.font = '20px Segoe UI';
      this.ctx.fillText('点击重新开始', this.width / 2, this.height / 2 + 60);
    }
  }
  
  private drawThemeButtons(theme: typeof THEMES.classic): void {
    const themes: ThemeType[] = ['classic', 'dark', 'candy'];
    const startX = this.width / 2 - 100;
    const y = this.height / 2 + 120;
    
    for (let i = 0; i < themes.length; i++) {
      const t = THEMES[themes[i]];
      const x = startX + i * 70;
      
      this.ctx.fillStyle = t.accent;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 20, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.fillStyle = theme.uiColor;
      this.ctx.font = '12px Segoe UI';
      this.ctx.fillText(t.name, x, y + 35);
    }
  }
  
  private gameLoop = (): void => {
    const now = Date.now();
    const dt = (now - this.lastTime) / 16.67;
    this.lastTime = now;
    
    this.update(dt);
    this.render();
    
    this.animationId = requestAnimationFrame(this.gameLoop);
  }
  
  public start(): void {
    this.lastTime = Date.now();
    this.gameLoop();
  }
  
  public destroy(): void {
    cancelAnimationFrame(this.animationId);
  }
}