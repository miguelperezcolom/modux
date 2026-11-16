// A book on the shelf (added off camera): Available, two copies. Withdraw it through the use case:
// done. Back in Books, the rule wrote it: WITHDRAWN (the listing shows the enum's name), no copies.
import { open, ensureBook, withdraw, tab, visible, shown } from './library.mjs';

export default async function ({ film, hand, page }) {
  await open(film, page);
  await ensureBook(film, page);
  await film.play(0.6);
  await hand.moveTo(shown(page, 'AVAILABLE'), 0.7);
  await film.play(1.0);
  await hand.click(tab(page, 'Withdraw a book'), { move: 0.6 });
  await film.settle(visible(page.getByRole('button', { name: 'Withdraw book' })), { after: 0.3 });
  await withdraw(film, hand, page);
  await film.settle(async () => (await page.getByText('Withdraw a book: done').count()) > 0, { after: 1.4 });
  await hand.click(tab(page, 'Books'), { move: 0.6 });
  await film.settle(async () => (await page.getByText('WITHDRAWN', { exact: true }).count()) > 0, { after: 0.4 });
  await hand.moveTo(shown(page, 'WITHDRAWN'), 0.7);
  await film.play(1.8);
}
