// The customer, in Sales: the concert picker (Sales' own copy of Catalog's concerts) already has the
// new concert; three tickets, Buy. The bank is held so the purchase is seen PENDING (confirmed.mjs).
import { signIn, menu, holdBank } from '../../01-in-3-minutes/live/tickets.mjs';

export default async function ({ film, hand, page }) {
  await signIn(film, page, 'customer');
  await film.play(0.4);
  await menu(film, hand, page, 'Sales', 'Buy tickets');
  await film.settle(async () => (await page.locator('#concertId input').count()) > 0);
  // open the picker without typing: what it lists is the read model
  await hand.click(page.locator('#concertId input').first(), { move: 0.4 });
  const item = page.locator('vaadin-combo-box-item', { hasText: 'Northern Lights Quartet' });
  await film.settle(async () => (await item.count()) > 0, { after: 0.6 });
  if (!(await item.first().isVisible())) {   // a combo that opens only on typing
    await hand.type('Northern', 0.07);
    await film.settle(async () => (await item.count()) > 0 && (await item.first().isVisible()), { after: 0.4 });
  }
  await hand.moveTo(item.first(), 0.5);
  await film.play(0.6);
  await hand.click(item.first(), { move: 0.2 });
  await hand.fill(page.locator('#customer input').first(), 'sam.rivera@example.com', { move: 0.3 });
  await hand.fill(page.locator('#tickets input').first(), '3', { move: 0.3 });
  await hand.fill(page.locator('#card input').first(), '4242 4242 4242 4242', { move: 0.3 });
  await film.play(0.3);
  await holdBank(true);   // released in confirmed.mjs, once PENDING is on screen
  await hand.click(page.getByText('Buy', { exact: true }).last(), { move: 0.5 });
  await film.settle(async () => (await page.getByText(/^Purchase: /).count()) > 0, { after: 1.6 });
}
