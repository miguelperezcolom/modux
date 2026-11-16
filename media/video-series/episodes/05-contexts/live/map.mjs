// The context map in the modux editor: an isolated modux server on :8195 over a copy of the
// Tickets model (see the README and .claude/skills/verify). The whole map, then the camera goes to
// the four contexts and the relations between them.
export default async function ({ film, hand, page }) {
  await page.goto('http://localhost:8195/modux/editor/version');
  await page.evaluate(async () => {
    await import('/modux-editor/modux-editor.js');
    const el = document.createElement('modux-editor-connected');
    el.setAttribute('base', '/modux/editor');
    el.setAttribute('lang', 'en');
    document.body.style.margin = '0';
    el.style.cssText = 'display:block;width:100vw;height:100vh';
    document.body.innerHTML = '';
    document.body.appendChild(el);
  });
  await film.wait(async () => (await page.getByText('Payments', { exact: true }).count()) > 0);
  await page.locator('button', { hasText: '☰' }).first().click();  // fold the palette
  await film.idle(1);   // the canvas takes the palette's width before fitting
  await page.locator('button', { hasText: 'Fit' }).first().click();
  await film.idle(2);
  await film.play(1.2);
  // the camera: wheel over the middle of the four contexts
  const box = async (name) => page.getByText(name, { exact: true }).first().boundingBox();
  const bs = await Promise.all(['Catalog', 'Sales', 'Payments', 'Analytics'].map(box));
  const x0 = Math.min(...bs.map((b) => b.x)), x1 = Math.max(...bs.map((b) => b.x + b.width));
  const y0 = Math.min(...bs.map((b) => b.y)), y1 = Math.max(...bs.map((b) => b.y + b.height));
  await hand.moveTo({ x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, 0.8);   // zoom around the four contexts' centre
  await hand.scroll(-240, 1.6);
  await film.play(0.4);
  for (const name of ['Catalog', 'Sales', 'Payments', 'Analytics']) {
    await hand.moveTo(page.getByText(name, { exact: true }).first(), 0.7);
    await film.play(0.5);
  }
  // Sales ⇄ Payments, customer and supplier both ways; the flows between them
  for (const label of ['charge', 'reject']) {
    const l = page.getByText(label, { exact: true }).first();
    if (await l.count() && await l.isVisible()) { await hand.moveTo(l, 0.6); await film.play(0.5); }
  }
  await hand.hide();
  await film.play(1.0);
}
