// The running Tickets system (media/promo-video/app, `mvn modux:deploy`): gateway on :8088,
// Mailpit on :8025. The demo users are the ones the generated shell defines per role.
export const BASE = 'http://localhost:8088';

/** Signs in off camera: the shot starts on the signed-in home. */
export async function signIn(film, page, user) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name=username]', user);
  await page.fill('input[name=password]', user);
  await page.click('button[type=submit]');
  await film.wait(async () => page.url() === `${BASE}/`);
  await film.wait(async () => (await page.getByText('Tickets', { exact: true }).count()) > 0);
  await film.idle(1.2);
}

/** A top-level menu, then one of its entries — on camera. */
export async function menu(film, hand, page, top, item) {
  await hand.click(page.getByText(top, { exact: true }).first());
  await film.play(0.35);
  if (item) {
    await hand.click(page.getByText(item, { exact: true }).first(), { move: 0.5 });
  }
}

export const visible = (page, text, opts = {}) => async () => (await page.getByText(text, { exact: true, ...opts }).count()) > 0;
