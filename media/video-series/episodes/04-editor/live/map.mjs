// The system map of Tickets, as the model draws it: the camera is the editor's own Fit; the hand
// points at an actor, a context and the card gateway (hover lights each one's neighbourhood).
import { reset, openEditor, node } from './editor.mjs';

export default async function ({ film, hand, page }) {
  reset();
  await openEditor(film, page);
  await film.play(1.4);
  for (const id of ['role-customer', 'bc-sales', 'bc-payments', 'ext-paygate']) {
    await hand.moveTo(node(page, id), 0.9);
    await film.play(1.3);
  }
  await hand.moveTo({ x: 640, y: 640 }, 0.8);
  await film.play(0.6);
}
