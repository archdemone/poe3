import { Engine } from 'babylonjs';
import { bootPolishPreview } from './route';

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error('renderCanvas not found');
}
const engine = new Engine(canvas as HTMLCanvasElement, true);
bootPolishPreview(canvas as HTMLCanvasElement, engine);
