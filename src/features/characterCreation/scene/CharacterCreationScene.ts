import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { SpotLight } from '@babylonjs/core/Lights/spotLight';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Scene } from '@babylonjs/core/scene';

import { logSceneEvent } from '../../../devtools/sceneDebug';

import { PreviewAvatar, AppearanceOpts } from './previewAvatar';


export class CharacterCreationScene {
  private scene: Scene;
  private camera: ArcRotateCamera;
  private avatar: PreviewAvatar;
  private disposables: Array<{ dispose: () => void }> = [];
  private previousCamera: any = null;

  constructor(engine: Engine, canvasEl: HTMLCanvasElement) {
    void canvasEl;
    logSceneEvent('CharacterCreationScene created');
    // Reuse the shared scene so engine.runRenderLoop continues to render
    const shared = (window as any).__gameScene as Scene | undefined;
    this.scene = shared ?? new Scene(engine);
    this.scene.clearColor = new Color4(0.03, 0.03, 0.05, 1);

    // Save and swap active camera
    this.previousCamera = this.scene.activeCamera;
    this.camera = new ArcRotateCamera('creatorCam', Math.PI / 4, 0.8, 6, new Vector3(0, 1, 0), this.scene);
    this.camera.lowerRadiusLimit = 4;
    this.camera.upperRadiusLimit = 8;
    this.scene.activeCamera = this.camera;

    // Ambient + spotlight
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.5;
    const spot = new SpotLight('spot', new Vector3(2, 4, -2), new Vector3(-0.3, -1, 0.2), Math.PI / 3, 2, this.scene);
    spot.intensity = 1.2;
    this.disposables.push(hemi);
    this.disposables.push(spot);

    // Ground
    const ground = MeshBuilder.CreateGround('creatorGround', { width: 8, height: 8 }, this.scene);
    this.disposables.push(ground);

    // Avatar
    this.avatar = new PreviewAvatar(this.scene as any);

    // Marker for tests
    (this.scene as any)._isCreator = true;
  }

  setClass(id: string) {
    this.avatar.setClass(id);
  }

  setAscendancy(id: string) {
    this.avatar.setAscendancy(id);
  }

  setAppearance(opts: AppearanceOpts) {
    this.avatar.setAppearance(opts);
  }

  dispose() {
    logSceneEvent('CharacterCreationScene disposed');
    this.avatar.dispose();
    // Dispose created nodes/lights and restore camera
    for (const d of this.disposables) {
      try { d.dispose(); } catch {}
    }
    this.disposables = [];
    if (this.previousCamera) {
      this.scene.activeCamera = this.previousCamera;
    }
    // Only dispose private scene (if we created it)
    if (!(window as any).__gameScene) {
      this.scene.dispose();
    }
  }
}
