import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MojimotoDocument } from '@mojimoto/client';
import { SliceZone, type SliceComponents } from './SliceZone';

function doc(id: number, type: string, data: Record<string, unknown> = {}): MojimotoDocument {
  return { id, uid: `${type}-${id}`, type, lang: 'en-gb', status: 'published', published_at: null, updated_at: '', data };
}

const components: SliceComponents = {
  hero: ({ slice }) => <section data-testid="hero">{String(slice.data.heading ?? '')}</section>,
  block: ({ slice, index }) => <div data-testid="block">{`${slice.uid}#${index}`}</div>,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('<SliceZone>', () => {
  it('renders each slice through its mapped component, in order', () => {
    const slices = [doc(1, 'hero', { heading: 'Welcome' }), doc(2, 'block'), doc(3, 'block')];
    const { container, getByTestId } = render(<SliceZone slices={slices} components={components} />);

    expect(getByTestId('hero').textContent).toBe('Welcome');
    expect(container.querySelectorAll('[data-testid="block"]')).toHaveLength(2);
    // Order + index are preserved.
    expect(container.textContent).toBe('Welcomeblock-2#1block-3#2');
  });

  it('returns null for empty, null, or undefined slices', () => {
    expect(render(<SliceZone slices={[]} components={components} />).container.innerHTML).toBe('');
    expect(render(<SliceZone slices={null} components={components} />).container.innerHTML).toBe('');
    expect(render(<SliceZone slices={undefined} components={components} />).container.innerHTML).toBe('');
  });

  it('skips unresolved reference stubs that carry no data', () => {
    const stub = { id: 9, type: 'hero', uid: 'hero-9' } as unknown as MojimotoDocument;
    const { container, getAllByTestId } = render(
      <SliceZone slices={[doc(1, 'hero', { heading: 'Real' }), stub]} components={components} />,
    );
    expect(getAllByTestId('hero')).toHaveLength(1);
    expect(container.textContent).toBe('Real');
  });

  it('warns and renders nothing for a slice type with no component (dev)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(<SliceZone slices={[doc(1, 'unknown_type')]} components={components} />);

    expect(container.innerHTML).toBe('');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown_type'));
  });

  it('uses the fallback component for unmapped slice types', () => {
    const fallback: SliceComponents['x'] = ({ slice }) => <em data-testid="fallback">{slice.type}</em>;
    const { getByTestId } = render(
      <SliceZone slices={[doc(1, 'mystery')]} components={components} fallback={fallback} />,
    );
    expect(getByTestId('fallback').textContent).toBe('mystery');
  });

  it('threads context through to every slice component', () => {
    const ctxComponents: SliceComponents<{ theme: string }> = {
      hero: ({ context }) => <span data-testid="ctx">{context.theme}</span>,
    };
    const { getByTestId } = render(
      <SliceZone slices={[doc(1, 'hero')]} components={ctxComponents} context={{ theme: 'dark' }} />,
    );
    expect(getByTestId('ctx').textContent).toBe('dark');
  });
});
