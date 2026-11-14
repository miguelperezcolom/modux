// A second book (added off camera, through the same screen); the list, a search, the detail.
import { open, fillBook, has, BOOKS } from './library.mjs';

export default async function ({ film, hand, page }) {
  await open(film, page);
  if (!(await page.getByText(BOOKS[1].title, { exact: true }).count())) {
    await page.getByRole('button', { name: 'New' }).first().click();
    await film.wait(async () => (await page.locator('vaadin-text-field#title').count()) > 0);
    await fillBook(film, null, page, BOOKS[1]);
    await page.getByRole('button', { name: 'Save' }).first().click();
    await film.wait(async () => (await page.getByText(/saved/i).count()) > 0);
    await open(film, page);
  }
  await film.wait(has(page, BOOKS[1].title));
  await film.play(1.2);
  await hand.fill(page.getByPlaceholder('Search').first(), 'Le Guin', { move: 0.6 });
  await hand.press('Enter', 0.1);   // the listing searches on Enter
  await film.settle(async () => !(await page.getByText(BOOKS[1].title, { exact: true }).first().isVisible()), { after: 1.2 });
  await hand.click(page.getByText(BOOKS[0].title, { exact: true }).first(), { move: 0.6 });
  await film.settle(has(page, '12.50'), { after: 0.6 });
  await hand.moveTo(page.getByText('12.50', { exact: true }).first(), 0.6);
  await film.play(1.8);
}
