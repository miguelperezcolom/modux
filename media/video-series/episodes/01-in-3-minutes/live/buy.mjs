// A customer picks the concert and buys three tickets: PENDING, then CONFIRMED.
import { signIn, menu, visible, waitStatus, holdBank } from './tickets.mjs';

export async function buy({ film, hand, page }, tickets, card) {
  await menu(film, hand, page, 'Sales', 'Buy tickets');
  await film.settle(async () => (await page.locator('#concertId input').count()) > 0);
  await hand.click(page.locator('#concertId input').first(), { move: 0.35 });
  await hand.type('Midnight', 0.07);
  await film.settle(async () => (await page.locator('vaadin-combo-box-item', { hasText: 'The Midnight Owls' }).count()) > 0, { after: 0.3 });
  await hand.click(page.locator('vaadin-combo-box-item', { hasText: 'The Midnight Owls' }).first(), { move: 0.35 });
  await hand.fill(page.locator('#customer input').first(), 'alex.morgan@example.com', { move: 0.3 });
  await hand.fill(page.locator('#tickets input').first(), String(tickets), { move: 0.3 });
  await hand.fill(page.locator('#card input').first(), card, { move: 0.3 });
  await film.play(0.3);
  await hand.click(page.getByText('Buy', { exact: true }).last(), { move: 0.5 });
  await film.settle(async () => (await page.getByText(/^Purchase: /).count()) > 0, { after: 1.0 });
}

export default async function (ctx) {
  const { film, hand, page } = ctx;
  await signIn(film, page, 'customer');
  await film.play(0.4);
  await holdBank(true);   // the bank answers once the PENDING purchase has been seen
  await buy(ctx, 3, '4242 4242 4242 4242');
  // straight to the list: the bank is still answering, so it shows PENDING…
  await menu(film, hand, page, 'Sales', 'Purchases');
  try {
    await film.settle(visible(page, 'PENDING'), { after: 1.2 });
  } finally {
    await holdBank(false);
  }
  // the bank answers; the listing doesn't refresh by itself: search again (Enter in the search box)
  await waitStatus('CONFIRMED');
  await hand.click(page.getByPlaceholder('Search').first(), { move: 0.5 });
  await hand.press('Enter', 0.1);
  await film.settle(visible(page, 'CONFIRMED'), { timeout: 40, after: 0.4 });
  await hand.moveTo(page.getByText('CONFIRMED', { exact: true }).first(), 0.6);
  await film.play(1.6);
}
