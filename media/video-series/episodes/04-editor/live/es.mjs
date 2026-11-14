// The same editor with lang="es": the palette open, the map fitted.
import { openEditor, node } from './editor.mjs';

export default async function ({ film, hand, page }) {
  await openEditor(film, page, { lang: 'es', palette: true });
  await film.play(0.8);
  await hand.moveTo(page.getByText('Contexto', { exact: true }).first(), 1.0);
  await film.play(0.8);
  await hand.moveTo(page.getByText('Sistema externo', { exact: true }).first(), 0.6);
  await film.play(0.8);
  await hand.moveTo(node(page, 'bc-payments'), 1.0);
  await film.play(1.2);
}
