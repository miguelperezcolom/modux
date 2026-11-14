// The promoter puts a concert on sale: Catalog → Concerts → New, the form, Save.
import { signIn, menu, visible } from './tickets.mjs';

export default async function ({ film, hand, page }) {
  await signIn(film, page, 'promoter');
  await film.play(0.5);
  await menu(film, hand, page, 'Catalog', 'Concerts');
  await film.settle(visible(page, 'New'));
  await hand.click(page.getByRole('button', { name: 'New' }).first());
  await film.settle(async () => (await page.locator('vaadin-text-field#artist').count()) > 0);
  await hand.fill(page.locator('vaadin-text-field#artist input'), 'The Midnight Owls', { move: 0.35 });
  await hand.fill(page.locator('vaadin-text-field#venue input'), 'Riverside Arena', { move: 0.3 });
  await hand.fill(page.locator('vaadin-date-picker#date input'), '6/12/2027', { move: 0.3 });
  await hand.press('Enter', 0.3);
  await hand.fill(page.locator('vaadin-integer-field#capacity input'), '10', { move: 0.3 });
  await hand.fill(page.locator('vaadin-number-field#price input'), '40', { move: 0.3 });
  await hand.click(page.locator('vaadin-select#status'), { move: 0.3 });
  await film.play(0.4);
  await hand.click(page.locator('vaadin-select-item', { hasText: 'On sale' }).first(), { move: 0.35 });
  await film.play(0.3);
  await hand.click(page.getByText('Save', { exact: true }).first(), { move: 0.5 });
  await film.settle(visible(page, 'Item saved successfully', { exact: false }), { after: 1.6 });
}
