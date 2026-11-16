// The same book, withdrawn again: refused, with the rule's own message.
import { open, withdraw, visible, shown } from './library.mjs';

export default async function ({ film, hand, page }) {
  await open(film, page);
  await film.play(0.8);
  await withdraw(film, hand, page);
  await film.settle(visible(page.getByText('The book is already withdrawn')), { after: 0.6 });
  await hand.moveTo(shown(page, 'The book is already withdrawn'), 0.6);
  await film.play(2.4);
}
