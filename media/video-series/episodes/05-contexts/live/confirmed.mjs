// The purchase in Sales' list: PENDING while the bank is held, then the bank answers, Payments
// publishes PaymentAccepted through its outbox, Sales confirms; searching again shows CONFIRMED.
import { signIn, menu, visible, waitStatus, holdBank } from '../../01-in-3-minutes/live/tickets.mjs';

export default async function ({ film, hand, page }) {
  try {
    await signIn(film, page, 'customer');
    await film.play(0.3);
    await menu(film, hand, page, 'Sales', 'Purchases');
    await film.settle(visible(page, 'PENDING'), { after: 1.0 });
    await hand.moveTo(page.getByText('PENDING', { exact: true }).first(), 0.5);
    await film.play(0.8);
  } finally {
    await holdBank(false);
  }
  await waitStatus('CONFIRMED');
  await hand.click(page.getByPlaceholder('Search').first(), { move: 0.5 });
  await hand.press('Enter', 0.1);
  await film.settle(visible(page, 'CONFIRMED'), { timeout: 40, after: 0.4 });
  await hand.moveTo(page.getByText('CONFIRMED', { exact: true }).first(), 0.6);
  await film.play(1.6);
}
