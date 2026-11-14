// ✨ Auto-layout over the unfolded map, then Fit.
import { openEditor, button } from './editor.mjs';

export default async function ({ film, hand, page }) {
  await openEditor(film, page, { fit: true });
  await film.play(0.8);
  await hand.click(button(page, 'Auto-layout'), { move: 0.9 });
  await film.play(1.2);
  await hand.click(button(page, 'Fit'), { move: 0.6 });
  await film.play(1.0);
  await hand.moveTo({ x: 1150, y: 640 }, 0.8);
  await film.play(0.8);
  // off camera: the layout save (debounced) reaches the server before the page closes
  await film.idle(1.0);
  await new Promise((r) => setTimeout(r, 1500));
}
