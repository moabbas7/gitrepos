/**
 * Deterministic placeholder avatar (SVG markup or data URI) for seed/sample data, so fictional
 * repos never point at real GitHub accounts.
 */
export function placeholderAvatarSvg(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const cells: string[] = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      if ((h >> (y * 3 + x)) & 1) {
        cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
        if (x < 2) cells.push(`<rect x="${4 - x}" y="${y}" width="1" height="1"/>`);
      }
    }
  }
  // Monochrome (DESIGN.md: three colours only) — white at opacity on the canvas black.
  const alpha = 0.55 + (Math.abs(h) % 30) / 100;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 7 7"><rect x="-1" y="-1" width="7" height="7" fill="#07070B"/><g fill="#FAFAFA" fill-opacity="${alpha.toFixed(2)}">${cells.join("")}</g></svg>`;
}

export function placeholderAvatar(seed: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(placeholderAvatarSvg(seed))}`;
}
