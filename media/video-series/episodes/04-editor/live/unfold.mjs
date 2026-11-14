// Payments unfolds: its chevron, and its pieces arrive around it — where the editor puts them.
import { openEditor, toggle, nodeIds } from './editor.mjs';

export default async function ({ film, hand, page }) {
  await openEditor(film, page);
  await film.play(0.8);
  await hand.click(toggle(page, 'bc-payments'), { move: 0.9 });
  await film.settle(async () => (await nodeIds(page)).includes('ev-payment-declined'), { after: 0.6 });
  await hand.moveTo({ x: 1150, y: 640 }, 0.8);
  await film.play(1.0);
  // off camera: the layout save (debounced) reaches the server before the page closes
  await film.idle(1.0);
  await new Promise((r) => setTimeout(r, 1500));
}
