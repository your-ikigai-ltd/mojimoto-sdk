import { describe, expect, it, vi } from 'vitest';

describe('in React Server Components', () => {
  it('loads and renders rich text without context', async () => {
    vi.resetModules();

    vi.doMock('react', async () => {
      const react = await vi.importActual<typeof import('react')>('react');

      return { ...react, createContext: undefined, useContext: undefined };
    });

    const { MojiRichText } = await import('./MojiRichText');

    const tree = MojiRichText({ field: [{ type: 'paragraph', text: 'Rendered on the server', spans: [] }] });

    expect(JSON.stringify(tree)).toContain('Rendered on the server');

    vi.doUnmock('react');
  });
});
