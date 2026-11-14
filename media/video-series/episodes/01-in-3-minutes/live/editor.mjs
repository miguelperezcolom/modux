// The model in the modux editor (a modux server over the Tickets model on :8193 — see the README).
// The real editor component, in English, its palette folded; the camera is the editor's own
// fit and zoom.
export default async function ({ film, hand, page }) {
  await page.goto('http://localhost:8193/modux/editor/version');
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
  await film.wait(async () => (await page.getByText('Sales', { exact: true }).count()) > 0);
  await page.locator('button', { hasText: '☰' }).first().click();  // fold the palette
  await page.locator('button', { hasText: 'Fit' }).first().click();
  await film.idle(1.5);
  await film.play(0.8);
  for (const name of ['CUSTOMER', 'Sales', 'Payments', 'Paygate']) {
    const n = page.getByText(name, { exact: true }).first();
    if (await n.count()) { await hand.moveTo(n, 0.8); await film.play(0.6); }
  }
  await hand.hide();
  await film.play(1.0);
}
