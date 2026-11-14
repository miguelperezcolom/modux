// The Yugo surface over the same view; the search box unfolds the path to an element and flies there.
import { openEditor, button } from './editor.mjs';

export default async function ({ film, hand, page }) {
  await openEditor(film, page);
  await film.play(0.5);
  await hand.click(button(page, 'Yugo'), { move: 0.8 });
  await film.play(2.2);
  await hand.click(page.getByPlaceholder('Search the model…'), { move: 0.7 });
  await hand.type('Declined', 0.07);
  await film.play(0.6);
  await hand.click(page.getByText('PaymentDeclined', { exact: true }).first(), { move: 0.5 });
  await film.play(3.0);
}
