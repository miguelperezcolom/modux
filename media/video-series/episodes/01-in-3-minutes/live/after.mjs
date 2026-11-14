// What it leaves behind: the purchase's history (event sourced), the email, the dashboard.
import { signIn, menu, visible, BASE } from './tickets.mjs';

export default async function ({ film, hand, page }) {
  await signIn(film, page, 'customer');
  await film.play(0.3);
  await menu(film, hand, page, 'Sales', 'Purchase history');
  await film.settle(async () => (await page.locator('vaadin-grid').count()) > 0, { after: 2.4 });
  // the email the customer got: Mailpit catches everything the system sends
  await page.goto('http://localhost:8025/');
  await film.settle(async () => (await page.getByText('Your purchase 1').count()) > 0, { after: 0.4 });
  await hand.click(page.getByText('Your purchase 1').first(), { move: 0.6 });
  await film.settle(async () => (await page.locator('iframe').count()) > 0, { after: 2.0 });
  // management's dashboard
  await page.context().clearCookies();
  await signIn(film, page, 'management');
  await hand.click(page.getByText('Analytics', { exact: true }).first(), { move: 0.6 });
  await film.settle(visible(page, 'The Midnight Owls'), { after: 0.6 });
  await hand.moveTo(page.getByText('The Midnight Owls', { exact: true }).first(), 0.7);
  await film.play(2.0);
}
