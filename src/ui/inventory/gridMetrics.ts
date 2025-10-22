export interface GridMetrics {
  cell: number;
  gap: number;
  padLeft: number;
  padTop: number;
}

/** Reads CSS-driven sizing metrics for an inventory grid. */
export function readGridMetrics(
  container: HTMLElement,
  fallback: GridMetrics
): GridMetrics {
  const styles = getComputedStyle(container);
  const parse = (value: string | null | undefined, fallbackValue: number) => {
    if (!value) return fallbackValue;
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallbackValue;
  };

  return {
    cell: parse(styles.getPropertyValue('--cell'), fallback.cell),
    gap: parse(styles.getPropertyValue('--gap'), fallback.gap),
    padLeft: parse(styles.paddingLeft, fallback.padLeft),
    padTop: parse(styles.paddingTop, fallback.padTop),
  };
}
