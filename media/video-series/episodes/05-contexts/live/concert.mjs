// The promoter puts a new concert on sale in Catalog: Catalog → Concerts → New, the form, Save.
import { signIn, menu, visible } from '../../01-in-3-minutes/live/tickets.mjs';

export default async function ({ film, hand, page }) {
  await signIn(film, page, 'promoter');
  await film.play(0.4);
  await menu(film, hand, page, 'Catalog', 'Concerts');
  await film.settle(visible(page, 'New'));
  await hand.click(page.getByRole('button', { name: 'New' }).first());
  await film.settle(async () => (await page.locator('vaadin-text-field#artist').count()) > 0);
  await hand.fill(page.locator('vaadin-text-field#artist input'), 'Northern Lights Quartet', { move: 0.35 });
  await hand.fill(page.locator('vaadin-text-field#venue input'), 'Harbour Hall', { move: 0.3 });
  await hand.fill(page.locator('vaadin-date-picker#date input'), '9/18/2027', { move: 0.3 });
  await hand.press('Enter', 0.3);
  await hand.fill(page.locator('vaadin-integer-field#capacity input'), '200', { move: 0.3 });
  await hand.fill(page.locator('vaadin-number-field#price input'), '35', { move: 0.3 });
  await hand.click(page.locator('vaadin-select#status'), { move: 0.3 });
  await film.play(0.4);
  await hand.click(page.locator('vaadin-select-item', { hasText: 'On sale' }).first(), { move: 0.35 });
  await film.play(0.3);
  await hand.click(page.getByText('Save', { exact: true }).first(), { move: 0.5 });
  await film.settle(visible(page, 'Item saved successfully', { exact: false }), { after: 1.4 });
}
