import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MojimotoClient, MojimotoDocument } from '@mojimoto/client';
import type { SliceComponents } from '@mojimoto/react';
import { createSlicePreviewPage } from './preview';

function doc(id: number, type: string, data: Record<string, unknown> = {}): MojimotoDocument {
  return { id, uid: `${type}-${id}`, type, lang: 'en-gb', status: 'published', published_at: null, updated_at: '', data };
}

const components: SliceComponents = {
  hero: ({ slice }) => <h1>{String(slice.data.heading ?? '')}</h1>,
};

function clientWith(byUid: ReturnType<typeof vi.fn>): MojimotoClient {
  return { byUid } as unknown as MojimotoClient;
}

describe('createSlicePreviewPage', () => {
  it('fetches the entry and renders it through the components map', async () => {
    const byUid = vi.fn().mockResolvedValue(doc(1, 'hero', { heading: 'Hi' }));
    const Page = createSlicePreviewPage({ client: clientWith(byUid), components });

    const { container } = render(await Page({ params: { type: 'hero', uid: 'home' } }));

    expect(container.querySelector('h1')?.textContent).toBe('Hi');
    expect(byUid).toHaveBeenCalledWith('hero', 'home', { preview: false, lang: undefined });
  });

  it('awaits promised params/searchParams and forwards preview + lang', async () => {
    const byUid = vi.fn().mockResolvedValue(doc(2, 'hero', { heading: 'X' }));
    const Page = createSlicePreviewPage({ client: clientWith(byUid), components, preview: true, lang: 'en-gb' });

    await Page({
      params: Promise.resolve({ type: 'hero', uid: 'a' }),
      searchParams: Promise.resolve({ lang: 'fr-fr' }),
    });

    expect(byUid).toHaveBeenCalledWith('hero', 'a', { preview: true, lang: 'fr-fr' });
  });

  it('accepts a client factory and wraps the output', async () => {
    const byUid = vi.fn().mockResolvedValue(doc(3, 'hero', { heading: 'Wrapped' }));
    const Page = createSlicePreviewPage({
      client: () => Promise.resolve(clientWith(byUid)),
      components,
      wrapper: ({ children }) => <main data-testid="wrap">{children}</main>,
    });

    const { getByTestId } = render(await Page({ params: { type: 'hero', uid: 'a' } }));

    expect(getByTestId('wrap').querySelector('h1')?.textContent).toBe('Wrapped');
  });
});
