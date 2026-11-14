// The generated `library` system, started by `mvn modux:deploy` (capture.sh): one service on :8091,
// its UI at /library. The model declares no roles, so there is no sign-in.
export const URL = 'http://localhost:8091/library';
export const has = (page, text) => async () => (await page.getByText(text, { exact: true }).count()) > 0;

export async function open(film, page) {
  await page.goto(URL);
  await film.wait(has(page, 'Books'));
  await film.wait(async () => (await page.getByRole('button', { name: 'New' }).count()) > 0);
  await film.idle(1.0);
}

/** Fills the New Book form (on camera when `hand` is given, off camera otherwise). */
export async function fillBook(film, hand, page, b) {
  const field = (tag, id) => page.locator(`${tag}#${id} input`).first();
  const steps = [['vaadin-text-field', 'title', b.title], ['vaadin-text-field', 'author', b.author], ['vaadin-text-field', 'isbn', b.isbn],
    ['vaadin-date-picker', 'published', b.published], ['vaadin-integer-field', 'copies', b.copies], ['vaadin-number-field', 'price', b.price]];
  if (b.pages) steps.push(['vaadin-integer-field', 'pages', b.pages]);
  for (const [tag, id, value] of steps) {
    if (hand) { await hand.fill(field(tag, id), value, { move: 0.35 }); if (id === 'published') await commitDate(film, page, () => hand.press('Enter', 0.25), () => hand.press('Escape', 0.25)); }
    else { await field(tag, id).click(); await page.keyboard.type(value); if (id === 'published') await commitDate(film, page, () => page.keyboard.press('Enter'), () => page.keyboard.press('Escape')); await film.idle(0.1); }
  }
  if (hand) { await hand.click(page.locator('vaadin-select#status'), { move: 0.35 }); await film.play(0.3); }
  else { await page.locator('vaadin-select#status').click(); await film.idle(0.4); }
  const item = page.locator('vaadin-select-item', { hasText: b.status }).first();
  if (hand) await hand.click(item, { move: 0.3 }); else { await item.click(); await film.idle(0.3); }
}

/** Enter commits the typed date; if the calendar is still open after it, Escape folds it (the value stays). */
async function commitDate(film, page, enter, escape) {
  await enter();
  await film.idle(0.3);
  if (await page.locator('vaadin-date-picker-overlay[opened]').count()) await escape();
}

export const BOOKS = [
  { title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin', isbn: '978-0441478125', published: '3/1/1969', copies: '3', price: '12.5', status: 'Available' },
  { title: 'Kindred', author: 'Octavia E. Butler', isbn: '978-0807083697', published: '6/1/1979', copies: '2', price: '16', status: 'Available' },
];
