import * as BABYLON from 'babylonjs';

export type AppearanceOpts = { pose?: 'a' | 'b'; tint?: 'a' | 'b' };

export class PreviewAvatar {
  private scene: BABYLON.Scene;
  private root: BABYLON.TransformNode;
  private body: BABYLON.Mesh;
  private mat: BABYLON.StandardMaterial;

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
    this.root = new BABYLON.TransformNode('previewRoot', this.scene);
    this.body = BABYLON.MeshBuilder.CreateCapsule('previewBody', { height: 1.8, radius: 0.35 }, this.scene);
    this.body.position = new BABYLON.Vector3(0, 0.9, 0);
    this.body.parent = this.root;
    this.mat = new BABYLON.StandardMaterial('previewMat', this.scene);
    this.mat.diffuseColor = new BABYLON.Color3(0.4, 0.6, 0.9);
    this.body.material = this.mat;
  }

  setClass(id: string) {
    if (id.includes('sentinel')) this.mat.diffuseColor = new BABYLON.Color3(0.8, 0.3, 0.3);
    else if (id.includes('huntress')) this.mat.diffuseColor = new BABYLON.Color3(0.3, 0.5, 0.9);
  }

  setAscendancy(id: string) {
    if (id.includes('warden')) this.mat.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    else if (id.includes('champion')) this.mat.emissiveColor = new BABYLON.Color3(0.15, 0.05, 0.05);
    else if (id.includes('pathfinder')) this.mat.emissiveColor = new BABYLON.Color3(0.05, 0.15, 0.05);
    else if (id.includes('marksman')) this.mat.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.15);
  }

  setAppearance(opts: AppearanceOpts) {
    if (opts.pose) {
      const angle = opts.pose === 'a' ? 0.2 : -0.2;
      this.root.rotation.y = angle;
    }
    if (opts.tint) {
      this.mat.specularColor = opts.tint === 'a' ? new BABYLON.Color3(0.3, 0.3, 0.3) : new BABYLON.Color3(0.1, 0.1, 0.1);
    }
  }

  dispose() {
    this.body.dispose();
    this.root.dispose();
  }
}
