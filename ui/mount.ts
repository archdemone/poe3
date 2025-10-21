export function ensureUiLayer(): HTMLElement {
  let root = document.getElementById("ui-layer") as HTMLElement | null;
  if (!root) {
    root = document.createElement("div");
    root.id = "ui-layer";
    document.body.appendChild(root);
  }
  return root;
}

export function ensureTwoDock(): HTMLElement {
  const root = ensureUiLayer();
  let dock = document.getElementById("ui-two-dock") as HTMLElement | null;
  if (!dock) {
    dock = document.createElement("div");
    dock.id = "ui-two-dock";
    root.appendChild(dock);
  }
  return dock;
}
