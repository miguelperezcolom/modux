// The app, empty; New; Save with nothing → the required title refused; filled in; saved.
import { open, fillBook, has, BOOKS } from './library.mjs';

export default async function ({ film, hand, page }) {
  await open(film, page);
  await film.play(1.0);
  await hand.click(page.getByRole('button', { name: 'New' }).first());
  await film.settle(async () => (await page.locator('vaadin-text-field#title').count()) > 0);
  await hand.click(page.getByRole('button', { name: 'Save' }).first(), { move: 0.6 });
  await film.settle(has(page, 'Cannot be empty'), { after: 1.4 });
  await hand.click(page.getByRole('button', { name: 'Dismiss' }).first(), { move: 0.5 });
  await film.play(0.3);
  await fillBook(film, hand, page, BOOKS[0]);
  await film.play(0.3);
  await hand.click(page.getByRole('button', { name: 'Save' }).first(), { move: 0.5 });
  await film.settle(async () => (await page.getByText(/saved/i).count()) > 0, { after: 1.4 });
}
