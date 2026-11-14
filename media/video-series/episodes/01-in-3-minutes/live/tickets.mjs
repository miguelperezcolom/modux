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

/**
 * Off camera, until the system has moved purchases to `status` (`count` of them): the bank answers
 * after PAYGATE_DELAY and the payment's event reaches Sales through the outbox, which takes longer
 * than filming wants to show. Asked to the system's own database, the source of truth.
 */
export async function waitStatus(status, count = 1, timeout = 180) {
  const { execFileSync } = await import('node:child_process');
  const t0 = Date.now();
  for (;;) {
    let n = 0;
    try {
      n = Number(execFileSync('docker', ['exec', 'tickets-postgres-1', 'psql', '-U', 'user_app', '-d', 'sales', '-tAc',
        `select count(*) from purchase_entity where col_status = '${status}'`]).toString().trim());
    } catch { n = 0; }
    if (n >= count) return;
    if (Date.now() - t0 > timeout * 1000) throw new Error(`no ${count} ${status} purchase(s) after ${timeout}s`);
    await new Promise((r) => setTimeout(r, 1500));
  }
}

/** Holds the mock bank (paygate.py): no charge is answered while the hold file exists. */
export const HOLD = '/tmp/paygate.hold';
export async function holdBank(on) {
  const fs = await import('node:fs');
  if (on) fs.writeFileSync(HOLD, 'filming'); else fs.rmSync(HOLD, { force: true });
}
