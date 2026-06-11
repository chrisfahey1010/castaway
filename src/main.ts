import "./style.css";
import { Game } from "./game/Game";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");

if (!canvas) {
  throw new Error("Missing #game-canvas element");
}

const gameCanvas = canvas;

async function bootstrap(): Promise<void> {
  const game = new Game(gameCanvas);
  await game.init();
  game.start();
  window.addEventListener("beforeunload", () => game.dispose());
}

void bootstrap();
