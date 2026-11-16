// The top of the rendered document, then the structural view (section 3): the services and their
// contexts, the apps, the external systems, the relations and events between Sales and Payments.
// The diagram is taller than the screen: the camera starts at its top and moves down to Sales.
import { open, heading, glide, node } from './doc.mjs';

export default async function ({ film, hand, page, epDir }) {
  await open(page, epDir);
  await film.play(1.4);
  await glide(film, page, heading(page, 'Structural view'), 1.6);
  await film.play(0.6);
  await hand.moveTo(node(page, 'service Analytics'), 0.6); await film.play(0.3);
  await hand.moveTo(node(page, 'service Catalog'), 0.6); await film.play(1.4);
  await hand.moveTo(node(page, 'app Catalog'), 0.6); await film.play(0.2);
  await hand.moveTo(node(page, 'app CatalogReports'), 0.5); await film.play(0.1);
  await glide(film, page, node(page, 'Paygate'), 1.0, 660);
  await hand.moveTo(node(page, 'Legacy'), 0.5); await film.play(0.4);
  await hand.moveTo(node(page, 'Paygate'), 0.4); await film.play(0.6);
  for (const label of ['PurchasePlaced', 'PaymentAccepted', 'PaymentDeclined']) { await hand.moveTo(node(page, label), 0.6); await film.play(0.4); }
  await hand.moveTo(page.locator('svg').getByText('CUSTOMER_SUPPLIER').first(), 0.6);
  await film.play(1.0);
  await hand.hide();
}
