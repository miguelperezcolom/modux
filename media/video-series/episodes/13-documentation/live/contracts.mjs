// Section 8, what the system exposes: each app's menu, each API's operations; section 9, the open
// points (decisions still PROPOSED: none yet).
import { open, heading, jump, glide } from './doc.mjs';

export default async function ({ film, hand, page, epDir }) {
  await open(page, epDir);
  await jump(page, heading(page, '8. Exposed contracts'));
  await film.play(0.8);
  await hand.moveTo(heading(page, 'Application Catalog'), 0.5); await film.play(0.6);
  await glide(film, page, heading(page, 'API PurchaseAPI'), 1.8);
  await hand.moveTo(page.locator('td', { hasText: '/purchase/{id}' }).first(), 0.5); await film.play(0.8);
  await glide(film, page, heading(page, '9. Open points'), 1.6, 440);
  await hand.moveTo(page.locator('em', { hasText: 'None' }).last(), 0.6);
  await film.play(1.4);
  await hand.hide();
}
