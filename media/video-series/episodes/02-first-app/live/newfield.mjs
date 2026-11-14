// After the change and the redeploy: the books are still there, and the form has Pages.
import { open, has, BOOKS } from './library.mjs';

export default async function ({ film, hand, page }) {
  await open(film, page);
  await film.wait(has(page, BOOKS[0].title));
  await film.play(1.4);
  await hand.click(page.getByRole('button', { name: 'New' }).first());
  await film.settle(async () => (await page.locator('vaadin-integer-field#pages').count()) > 0, { after: 0.4 });
  await hand.moveTo(page.locator('vaadin-integer-field#pages').first(), 0.7);
  await film.play(0.4);
  await hand.fill(page.locator('vaadin-integer-field#pages input').first(), '304', { move: 0.2 });
  await film.play(1.6);
}
