import { GameEngine } from './game';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const game = new GameEngine(canvas);
game.start();