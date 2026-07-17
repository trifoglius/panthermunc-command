/** Shared drag lock so OrbitControls yields while a cube is being moved. */

let dragCount = 0;
const listeners = new Set<(dragging: boolean) => void>();

export function setWorldCubeDragging(active: boolean) {
  if (active) dragCount += 1;
  else dragCount = Math.max(0, dragCount - 1);
  const dragging = dragCount > 0;
  listeners.forEach((fn) => fn(dragging));
}

export function subscribeWorldCubeDragging(
  fn: (dragging: boolean) => void
): () => void {
  listeners.add(fn);
  fn(dragCount > 0);
  return () => {
    listeners.delete(fn);
  };
}
