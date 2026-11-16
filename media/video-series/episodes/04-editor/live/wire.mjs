// The two lines: PaymentDeclined → the notification (it fires it), the notification → CUSTOMER (the
// role it goes to). Then what git sees, captured for the next two scenes.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openEditor, center, drag, handleTowards, git } from './editor.mjs';

const notificationId = (page) => page.evaluate(() => {
  const ed = document.querySelector('modux-editor-connected').shadowRoot.querySelector('modux-editor');
  return (ed.model.notifications ?? []).find((n) => n.name === 'CardDeclined')?.id;
});

export default async function ({ film, hand, page, epDir }) {
  await openEditor(film, page);
  const id = await notificationId(page);
  if (!id) throw new Error('no CardDeclined notification: render the notify scene first');
  await film.play(0.6);
  let to = await center(page, id);
  await drag(film, hand, await handleTowards(film, hand, 'ev-payment-declined', to), to, 1.4);
  await film.settle(async () => (await page.evaluate((id) => document.querySelector('modux-editor-connected').shadowRoot
    .querySelector('modux-editor').model.notifications.find((n) => n.id === id)?.eventId, id)) === 'ev-payment-declined', { after: 0.8 });
  to = await center(page, 'role-customer');
  await drag(film, hand, await handleTowards(film, hand, id, to), to, 1.6);
  await film.settle(async () => (await page.evaluate((id) => document.querySelector('modux-editor-connected').shadowRoot
    .querySelector('modux-editor').model.notifications.find((n) => n.id === id)?.recipientRoleIds ?? [], id)).includes('role-customer'), { after: 0.6 });
  await hand.moveTo({ x: 1150, y: 640 }, 0.8);
  await film.play(1.2);
  // what the terminal shows next: the real git of the model repo, once the layout save has landed
  await film.idle(1.5);
  await new Promise((r) => setTimeout(r, 1500));
  writeFileSync(resolve(epDir, 'real/status.txt'), git('status', '--short'));
  git('add', '-N', '.');
  writeFileSync(resolve(epDir, 'real/notification.diff'), git('diff', '--', 'modux/notifications'));
  git('reset', '-q');
}
