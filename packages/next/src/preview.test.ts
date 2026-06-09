import { describe, expect, it } from 'vitest';
import { safeRedirect } from './preview';

describe('safeRedirect', () => {
  it('allows same-origin relative paths and re-serializes them', () => {
    expect(safeRedirect('/', '/')).toBe('/');
    expect(safeRedirect('/blog/post', '/')).toBe('/blog/post');
    expect(safeRedirect('/search?q=hi#frag', '/')).toBe('/search?q=hi#frag');
  });

  it('rejects absolute and protocol-relative URLs', () => {
    expect(safeRedirect('https://evil.com', '/')).toBe('/');
    expect(safeRedirect('//evil.com', '/')).toBe('/');
    expect(safeRedirect('http:evil.com', '/')).toBe('/');
  });

  it('rejects backslash and mixed-slash bypasses', () => {
    // Browsers normalise `\` to `/`, so these would become protocol-relative.
    expect(safeRedirect('/\\evil.com', '/')).toBe('/');
    expect(safeRedirect('/\\/evil.com', '/')).toBe('/');
    expect(safeRedirect('\\\\evil.com', '/')).toBe('/');
  });

  it('falls back to the default, then "/", for empty or invalid input', () => {
    expect(safeRedirect(null, '/home')).toBe('/home');
    expect(safeRedirect(null, 'https://evil.com')).toBe('/');
  });
});
