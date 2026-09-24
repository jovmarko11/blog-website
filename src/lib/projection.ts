/**
 * projection.ts — a tiny 3D → 2D projection for SVG illustrations (no library).
 * Used by the About header (Trajectory3D) both at build time (static frame)
 * and in the browser (animated frames), so both always match.
 */
export type Vec3 = { x: number; y: number; z: number };
export type Camera = { yaw: number; pitch: number; scale: number; cx: number; cy: number; distance: number };

/** Rotate around the vertical axis (yaw), then tilt (pitch), then perspective-project. */
export function project(p: Vec3, cam: Camera): { x: number; y: number; depth: number } {
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
  const x1 = p.x * cy + p.z * sy;
  const z1 = -p.x * sy + p.z * cy;
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const y2 = p.y * cp - z1 * sp;
  const z2 = p.y * sp + z1 * cp;
  const s = cam.distance / (cam.distance - z2);
  return { x: cam.cx + x1 * s * cam.scale, y: cam.cy - y2 * s * cam.scale, depth: z2 };
}

/** Maps story coordinates (code, theory, time ∈ [0, 1]) into the scene box. */
export const toWorld = (code: number, theory: number, time: number): Vec3 => ({
  x: (code - 0.5) * 2,
  y: theory * 1.4 - 0.7,
  z: (time - 0.5) * 2.4,
});

export const FLOOR = -0.7; // y of the floor plane (theory = 0)
