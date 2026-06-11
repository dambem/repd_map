// Headstone marker images, drawn at runtime on a canvas so each palette
// colour gets its own pre-tinted stone (icon-image is a layout property, so
// it can't be tinted per-feature the way circle-color can).

import { COLORS, TECH, TECH_COLORS } from '$lib/config/constants.js';

const SIZE = 64; // drawn at 2x, displayed at 32px via pixelRatio

function drawHeadstone(color) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  ctx.lineJoin = 'round';

  // Stone: arch-topped slab
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(12, 13, 16, 0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(17, 52);
  ctx.lineTo(17, 26);
  ctx.arc(32, 26, 15, Math.PI, 0);
  ctx.lineTo(47, 52);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Plinth
  ctx.beginPath();
  ctx.rect(11, 50, 42, 9);
  ctx.fill();
  ctx.stroke();

  // Engraved lightning bolt — what's buried here is energy
  ctx.strokeStyle = 'rgba(12, 13, 16, 0.65)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(36, 19);
  ctx.lineTo(28, 32);
  ctx.lineTo(34, 32);
  ctx.lineTo(27, 45);
  ctx.stroke();

  return ctx.getImageData(0, 0, SIZE, SIZE);
}

/** Image ids keyed by semantic name, registered on the map. */
export const STONES = {
  confirmed: 'stone-confirmed',
  potential: 'stone-potential',
  none: 'stone-none',
  solar: 'stone-solar',
  wind: 'stone-wind',
  battery: 'stone-battery',
  other: 'stone-other',
};

export function registerHeadstoneImages(map) {
  const palette = {
    [STONES.confirmed]: COLORS.vermillion,
    [STONES.potential]: COLORS.ember,
    [STONES.none]: COLORS.ash,
    [STONES.solar]: TECH_COLORS[TECH.SOLAR],
    [STONES.wind]: TECH_COLORS[TECH.WIND],
    [STONES.battery]: TECH_COLORS[TECH.BATTERY],
    [STONES.other]: TECH_COLORS.other,
  };
  for (const [name, color] of Object.entries(palette)) {
    if (!map.hasImage(name)) map.addImage(name, drawHeadstone(color), { pixelRatio: 2 });
  }
}
