import { afterEach, describe, expect, it, vi } from 'vitest';
import { AREAS, CATALOGS } from '../catalog.js';
import { DEFAULT_LANGUAGE, language, normalizeLanguage, onLanguageChange, setLanguage, t } from '../index.js';

afterEach(() => {
  setLanguage(null);
  vi.unstubAllGlobals();
});

const page = (lang: string) => vi.stubGlobal('document', { documentElement: { lang } });
const browser = (lang: string) => vi.stubGlobal('navigator', { language: lang });

describe('catalog', () => {
  it('has the same keys in en and es', () => {
    expect(Object.keys(CATALOGS.es).sort()).toEqual(Object.keys(CATALOGS.en).sort());
  });

  it('has the same keys in en and es in every area, each with its area prefix', () => {
    let total = 0;
    for (const [area, tables] of Object.entries(AREAS)) {
      expect(Object.keys(tables.es).sort(), area).toEqual(Object.keys(tables.en).sort());
      for (const key of Object.keys(tables.en)) expect(key.startsWith(`${area}.`), key).toBe(true);
      total += Object.keys(tables.en).length;
    }
    // no key is defined by two areas (a later spread would silently win)
    expect(Object.keys(CATALOGS.en)).toHaveLength(total);
  });

  it('has no empty messages and the same placeholders in both languages', () => {
    const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    const es = CATALOGS.es as Record<string, string>;
    for (const [key, english] of Object.entries(CATALOGS.en as Record<string, string>)) {
      expect(english.trim(), key).not.toBe('');
      expect(es[key].trim(), key).not.toBe('');
      expect(placeholders(es[key]), key).toEqual(placeholders(english));
    }
  });
});

describe('language selection', () => {
  it('defaults to English', () => {
    expect(DEFAULT_LANGUAGE).toBe('en');
    page('');
    browser('');
    expect(language()).toBe('en');
  });

  it('maps anything starting with es to Spanish and the rest to English', () => {
    expect(normalizeLanguage('es')).toBe('es');
    expect(normalizeLanguage('es-ES')).toBe('es');
    expect(normalizeLanguage('ES-mx')).toBe('es');
    expect(normalizeLanguage('en-GB')).toBe('en');
    expect(normalizeLanguage('fr')).toBe('en');
    expect(normalizeLanguage('')).toBeUndefined();
    expect(normalizeLanguage(undefined)).toBeUndefined();
  });

  it('prefers the explicit language, then the page, then the browser', () => {
    browser('es-ES');
    page('');
    expect(language()).toBe('es');
    page('en');
    expect(language()).toBe('en');
    setLanguage('es');
    expect(language()).toBe('es');
    setLanguage(null);
    expect(language()).toBe('en');
  });

  it('notifies listeners when the effective language changes', () => {
    browser('en-US');
    page('');
    const seen: string[] = [];
    const off = onLanguageChange(() => seen.push(language()));
    setLanguage('es');
    setLanguage('es-ES');
    setLanguage('en');
    off();
    setLanguage('es');
    expect(seen).toEqual(['es', 'en']);
  });
});

describe('t', () => {
  it('renders the current language and fills placeholders', () => {
    const key = Object.keys(CATALOGS.en).find((k) => /\{\w+\}/.test((CATALOGS.en as Record<string, string>)[k]));
    expect(key).toBeDefined();
    const names = Object.fromEntries(
      ((CATALOGS.en as Record<string, string>)[key!].match(/\{\w+\}/g) ?? []).map((p) => [p.slice(1, -1), 'X']),
    );
    setLanguage('en');
    expect(t(key as never, names)).not.toMatch(/\{\w+\}/);
    setLanguage('es');
    expect(t(key as never)).toBe((CATALOGS.es as Record<string, string>)[key!]);
  });

  it('falls back to the key for an unknown message', () => {
    expect(t('no.such.key' as never)).toBe('no.such.key');
  });
});
