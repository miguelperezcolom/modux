// A new notification: the palette, filtered; dragged onto Payments; named with F2.
import { openEditor, button, center, drag, node, nodeIds } from './editor.mjs';

export default async function ({ film, hand, page, epDir }) {
  await openEditor(film, page);
  await film.play(0.6);
  await hand.click(button(page, '☰'), { move: 0.7 });
  await film.play(0.4);
  await hand.click(page.getByPlaceholder('Filter…'), { move: 0.6 });
  await hand.type('Notif', 0.08);
  await film.play(0.4);
  const before = await nodeIds(page);
  const item = await page.getByText('Notification', { exact: true }).first().boundingBox();
  await drag(film, hand, { x: item.x + 40, y: item.y + item.height / 2 }, await center(page, 'bc-payments'), 1.3);
  let id;
  await film.settle(async () => { id = (await nodeIds(page)).find((n) => !before.includes(n)); return !!id; }, { after: 0.8 });
  await hand.click(button(page, '☰'), { move: 0.6 });     // fold the palette again
  await film.play(0.4);
  await hand.click(node(page, id), { move: 0.8 });
  await film.play(0.3);
  await hand.press('F2', 0.4);
  await hand.type('CardDeclined', 0.07);
  await hand.press('Enter', 0.2);
  await film.settle(async () => (await page.getByText('CardDeclined', { exact: true }).count()) > 0, { after: 1.0 });
  // off camera: the layout save (debounced) reaches the server before the page closes
  await film.idle(1.0);
  await new Promise((r) => setTimeout(r, 1500));
}
