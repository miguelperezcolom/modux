// Captures the running Tickets system (mvn modux:deploy in app/, gateway on :8088, Mailpit on :8025)
// as the video shows it: real screens, 2x, one PNG per moment, plus the boxes of the elements the
// overlay points at (build/real/boxes.json, CSS pixels of a 1600x900 viewport).
//
//   (cd app/system && docker compose down -v) && (cd app && mvn modux:deploy) && python3 app/paygate/paygate.py &
//   node scripts/capture-real.mjs
//
// The users are the demo ones the generated shell defines for each role (password = user name).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(here, 'build/real');
mkdirSync(outDir, { recursive: true });
const BASE = 'http://localhost:8088';
const VIEW = { width: 1600, height: 900 };
const boxes = { viewport: { w: VIEW.width, h: VIEW.height } };

const browser = await chromium.launch();

async function as(user) {
  const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name=username]', user);
  await page.fill('input[name=password]', user);
  await page.click('button[type=submit]');
  await page.waitForURL(`${BASE}/`);
  await page.waitForTimeout(1500);
  return page;
}
async function menu(page, top, item) {
  await page.getByText(top, { exact: true }).first().click();
  await page.waitForTimeout(600);
  await page.getByText(item, { exact: true }).first().click();
  await page.waitForTimeout(2200);
}
async function box(name, locator) {
  const b = await locator.boundingBox();
  if (!b) throw new Error(`no box for ${name}`);
  boxes[name] = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
}
async function shot(page, name) {
  await page.mouse.move(VIEW.width - 2, VIEW.height - 2); // no hover state on screen
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(outDir, `${name}.png`) });
  console.log('shot', name);
}

// 1. The promoter puts a concert on sale.
const promoter = await as('promoter');
await menu(promoter, 'Catalog', 'Concerts');
await promoter.getByRole('button', { name: 'New' }).first().click();
await promoter.waitForTimeout(2200);
await shot(promoter, 'concert-empty');
await promoter.locator('vaadin-text-field#artist input').fill('The Midnight Owls');
await promoter.locator('vaadin-text-field#venue input').fill('Riverside Arena');
await promoter.locator('vaadin-date-picker#date input').fill('6/12/2027');
await promoter.keyboard.press('Enter');
await promoter.locator('vaadin-integer-field#capacity input').fill('10');
await promoter.locator('vaadin-number-field#price input').fill('40');
await promoter.locator('vaadin-select#status').click();
await promoter.waitForTimeout(400);
await promoter.locator('vaadin-select-item', { hasText: 'On sale' }).first().click();
await promoter.waitForTimeout(400);
await box('concert.form', promoter.locator('vaadin-text-field#artist'));
await box('concert.save', promoter.getByText('Save', { exact: true }).first());
await shot(promoter, 'concert-form');
await promoter.getByText('Save', { exact: true }).first().click();
await promoter.waitForTimeout(1800);
await box('concert.toast', promoter.getByText('Item saved successfully').first());
await shot(promoter, 'concert-saved');

// 2. A customer buys three tickets; the payment goes through.
const customer = await as('customer');
async function buy(tickets, card, tag) {
  await menu(customer, 'Sales', 'Buy tickets');
  await customer.locator('#concertId input').fill('1');
  await customer.locator('#customer input').fill('alex.morgan@example.com');
  await customer.locator('#tickets input').fill(String(tickets));
  await customer.locator('#card input').fill(card);
  await box(`${tag}.card`, customer.locator('vaadin-text-field#card'));
  await box(`${tag}.buy`, customer.getByText('Buy', { exact: true }).last());
  await shot(customer, `${tag}-form`);
  await customer.getByText('Buy', { exact: true }).last().click();
  await customer.waitForTimeout(1200);
  await box(`${tag}.result`, customer.getByText(/^Purchase: /).first());
  await shot(customer, `${tag}-done`);
}
await buy(3, '4242 4242 4242 4242', 'buy');
// straight to the list: the charge is still on its way
await menu(customer, 'Sales', 'Purchases');
await shot(customer, 'purchases-pending');

// 3. A card the bank declines.
await buy(2, '4111 1111 1111 0000', 'declined');
await customer.waitForTimeout(4000);
await menu(customer, 'Sales', 'Purchases');
await box('purchases.confirmed', customer.getByText('CONFIRMED', { exact: true }).first());
await box('purchases.rejected', customer.getByText('REJECTED', { exact: true }).first());
await box('purchases.reason', customer.getByText('Card declined by the issuing bank').first());
await shot(customer, 'purchases-final');

// 4. Event sourced: what happened to each purchase, in order.
await menu(customer, 'Sales', 'Purchase history');
await box('history.table', customer.locator('vaadin-grid').first());
await shot(customer, 'history');

// 5. Management's dashboard: confirmed sales per concert.
const management = await as('management');
await management.getByText('Analytics', { exact: true }).first().click();
await management.waitForTimeout(2200);
await box('dashboard.row', management.getByText('The Midnight Owls', { exact: true }).first());
await shot(management, 'dashboard');

// 6. The email the customer got (Mailpit catches everything the system sends).
const mail = await (await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 })).newPage();
await mail.goto('http://localhost:8025/');
await mail.waitForTimeout(1500);
await mail.getByText(/Your purchase/).first().click();
await mail.waitForTimeout(1500);
await shot(mail, 'email');

writeFileSync(resolve(outDir, 'boxes.json'), JSON.stringify(boxes, null, 2));
await browser.close();
console.log('boxes', Object.keys(boxes).length);
