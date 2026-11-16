// Section 4: the responsibilities table, then each context's aggregates and use cases, with the
// intent from the model — and a dash where the model says nothing (CloseSale).
import { open, heading, jump, glide } from './doc.mjs';

export default async function ({ film, hand, page, epDir }) {
  await open(page, epDir);
  await jump(page, heading(page, 'Responsibilities per container'));
  await film.play(0.6);
  await glide(film, page, heading(page, 'Payments'), 1.4);
  await hand.moveTo(page.locator('li', { hasText: 'Payment:' }).first(), 0.6); await film.play(0.6);
  await hand.moveTo(page.locator('td', { hasText: 'With the gateway' }).first(), 0.6); await film.play(0.8);
  await glide(film, page, heading(page, 'Catalog'), 1.2);
  await hand.moveTo(page.locator('li', { hasText: 'Concert:' }).first(), 0.6); await film.play(0.5);
  await hand.moveTo(page.locator('td', { hasText: 'Loads the concert' }).first(), 0.6); await film.play(1.4);
  await hand.moveTo(page.locator('tr', { hasText: 'CloseSale' }).locator('td').nth(1), 0.6); await film.play(2.8);
  await glide(film, page, heading(page, 'Sales'), 1.2);
  await hand.moveTo(page.locator('td', { hasText: 'With the current price' }).first(), 0.6);
  await film.play(0.8);
  await hand.hide();
}
