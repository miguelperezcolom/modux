// Section 6, the Purchase lifecycle as a state diagram; section 7, the cross-cutting concerns,
// pointing at the outbox line: who uses one, and who publishes directly and what that risks.
import { open, heading, jump, glide, node, textAt } from './doc.mjs';

export default async function ({ film, hand, page, epDir }) {
  await open(page, epDir);
  await jump(page, heading(page, '6. Lifecycles'));
  await film.play(0.5);
  for (const s of ['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED']) { await hand.moveTo(node(page, s), 0.5); await film.play(0.4); }
  await film.play(0.2);
  await glide(film, page, heading(page, '7. Cross-cutting concerns'), 1.2, 140);
  await film.play(3.3);
  await hand.moveTo(await textAt(page, 'li', 'Payments, Sales'), 0.6); await film.play(1.8);
  await hand.moveTo(await textAt(page, 'li', 'Analytics, Catalog'), 0.6); await film.play(1.4);
  await hand.moveTo(await textAt(page, 'li', 'loses the event'), 0.8);
  await film.play(2.0);
  await hand.hide();
}
