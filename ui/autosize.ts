export function autosizeContent(panel: HTMLElement, selector: string) {
  const body = panel.querySelector<HTMLElement>(".ui-panel__body");
  const inner = panel.querySelector<HTMLElement>(selector);  // eg. [data-autosize="inventory"]
  if (!body || !inner) return;

  // reset before measure
  inner.style.transform = "none";
  inner.style.transformOrigin = "top left";

  // available space inside panel body
  const availW = body.clientWidth;
  const availH = body.clientHeight;

  // content's natural size
  const needW = inner.scrollWidth;
  const needH = inner.scrollHeight;

  // compute scale, clamp to 1 (never upscale)
  const s = Math.min(1, availW / needW, availH / needH);

  inner.style.transform = `scale(${s})`;
  // keep body vertical only
  body.style.overflowX = "hidden";
}
