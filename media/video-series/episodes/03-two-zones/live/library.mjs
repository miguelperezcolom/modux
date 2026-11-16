// The library system of this episode, started by `mvn modux:deploy` (capture.sh, reset.sh): one
// service on :8091, its UI at /library, two tabs — the use case «Withdraw a book» and «Books».
export const URL = 'http://localhost:8091/library';
export const BOOK = { title: 'Kindred', author: 'Octavia E. Butler', copies: '2' };
export const has = (page, text) => async () => (await page.getByText(text, { exact: true }).count()) > 0;
export const visible = (loc) => async () => { try { return await loc.first().isVisible(); } catch { return false; } };
export const tab = (page, name) => page.getByRole('tab', { name });
/** The text as shown: Mateu also writes messages into an off-screen live region for screen readers. */
export const shown = (page, text) => page.getByText(text, { exact: true }).filter({ visible: true }).first();

export async function open(film, page) {
  await page.goto(URL);
  await film.wait(visible(page.getByRole('button', { name: 'Withdraw book' })));
  await film.idle(1.0);
}

/** Adds the book through the Books screen, off camera, unless it is already there. */
export async function ensureBook(film, page) {
  await tab(page, 'Books').click();
  await film.wait(visible(page.getByRole('button', { name: 'New' })));
  await film.idle(1.0);
  if (await page.getByText(BOOK.title, { exact: true }).count()) return;
  await page.getByRole('button', { name: 'New' }).first().click();
  await film.wait(async () => (await page.locator('vaadin-text-field#title').count()) > 0);
  const field = (tag, id) => page.locator(`${tag}#${id} input`).first();
  await field('vaadin-text-field', 'title').click(); await page.keyboard.type(BOOK.title);
  await field('vaadin-text-field', 'author').click(); await page.keyboard.type(BOOK.author);
  await field('vaadin-integer-field', 'copies').click(); await page.keyboard.type(BOOK.copies);
  await page.locator('vaadin-select#status').click(); await film.idle(0.4);
  await page.locator('vaadin-select-item', { hasText: 'Available' }).first().click(); await film.idle(0.3);
  await page.getByRole('button', { name: 'Save' }).first().click();
  await film.wait(async () => (await page.getByText(/saved/i).count()) > 0);
  await open(film, page);   // a fresh page, on the listing: no toast left over
  await tab(page, 'Books').click();
  await film.wait(visible(page.getByText(BOOK.title, { exact: true })));
  await film.idle(1.0);
}

/** Picks the book in the use case's form and runs it (on camera). */
export async function withdraw(film, hand, page) {
  await hand.click(page.locator('#bookId input, #bookId').first(), { move: 0.6 });
  await film.settle(visible(page.locator('vaadin-combo-box-item', { hasText: BOOK.title })), { after: 0.4 });
  await hand.click(page.locator('vaadin-combo-box-item', { hasText: BOOK.title }).first(), { move: 0.4 });
  await film.play(0.4);
  await hand.click(page.getByRole('button', { name: 'Withdraw book' }), { move: 0.5 });
}
