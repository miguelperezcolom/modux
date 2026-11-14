// A card the bank declines: the purchase ends REJECTED with the bank's reason.
import { signIn, menu, visible, waitStatus } from './tickets.mjs';
import { buy } from './buy.mjs';

export default async function (ctx) {
  const { film, hand, page } = ctx;
  await signIn(film, page, 'customer');
  await film.play(0.3);
  await buy(ctx, 2, '4111 1111 1111 0000');
  await waitStatus('REJECTED');
  await menu(film, hand, page, 'Sales', 'Purchases');
  await film.settle(visible(page, 'REJECTED'), { timeout: 40, after: 0.6 });
  await hand.moveTo(page.getByText('Card declined by the issuing bank').first(), 0.7);
  await film.play(2.2);
}
