/**
 * Smooth cursor arc generator using quadratic Bezier curves (D-02).
 * Produces natural-looking mouse movement paths with acceleration/deceleration.
 */

export interface CursorPoint {
  x: number;
  y: number;
}

/**
 * Generate points along a quadratic Bezier curve for smooth cursor movement.
 * Control point is perpendicular to the midpoint with randomized offset
 * to create natural-looking arcs (not straight lines).
 *
 * @param start - starting position
 * @param end - target position
 * @param steps - number of intermediate points (default 20 for ~60fps over ~330ms)
 * @returns Array of {x,y} points along the curved path
 */
export function generateCursorPath(
  start: CursorPoint,
  end: CursorPoint,
  steps = 20,
): CursorPoint[] {
  const points: CursorPoint[] = [];

  // Midpoint
  const mx = (start.x + end.x) / 2;
  const my = (start.y + end.y) / 2;

  // Distance and perpendicular direction
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Perpendicular offset: 15-30% of distance, randomly left or right
  const offsetPct = 0.15 + Math.random() * 0.15;
  const offsetDir = Math.random() > 0.5 ? 1 : -1;
  const offset = distance * offsetPct * offsetDir;

  // Perpendicular vector (normalized then scaled)
  const perpX = distance > 0 ? (-dy / distance) * offset : 0;
  const perpY = distance > 0 ? (dx / distance) * offset : 0;

  // Control point
  const cx = mx + perpX;
  const cy = my + perpY;

  for (let i = 0; i <= steps; i++) {
    // Ease-in-out t-mapping for natural acceleration/deceleration
    const rawT = i / steps;
    const t = easeInOutCubic(rawT);

    // Quadratic Bezier: B(t) = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2
    const oneMinusT = 1 - t;
    const x =
      oneMinusT * oneMinusT * start.x +
      2 * oneMinusT * t * cx +
      t * t * end.x;
    const y =
      oneMinusT * oneMinusT * start.y +
      2 * oneMinusT * t * cy +
      t * t * end.y;

    points.push({ x: Math.round(x), y: Math.round(y) });
  }

  return points;
}

/** Cubic ease-in-out for natural acceleration/deceleration */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Randomized delay for human-like timing jitter */
export function randomizeDelay(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Sleep with abort signal support */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timer = setTimeout(resolve, ms);

    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}
