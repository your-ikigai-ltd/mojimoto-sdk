import { type ComponentType, Fragment, type ReactNode } from 'react';
import type { MojimotoBlock, MojimotoDocument, MojimotoSlice } from '@mojimoto/client';

// `process` may be absent in the browser; bundlers (Next, Vite) replace
// `process.env.NODE_ENV` at build time. Declared locally to avoid pulling in
// @types/node for one dev-only warning.
declare const process: { env: { NODE_ENV?: string } } | undefined;

/**
 * Props every slice component receives. A "slice" is either a block from a
 * blocks field or a referenced entry from a References field - both carry a
 * `type` and `data`.
 */
export interface SliceComponentProps<T extends MojimotoSlice = MojimotoDocument, C = unknown> {
  /** The section document being rendered. */
  slice: T;
  /** Its position within the zone (0-based). */
  index: number;
  /** All renderable slices in the zone, for cross-slice awareness. */
  slices: T[];
  /** Arbitrary value threaded through from `<SliceZone context={...} />`. */
  context: C;
}

/** A component that renders one slice type. */
// Per-type components are stored under a string key, so the registry is
// intentionally loose on the document generic.
export type SliceComponent<T extends MojimotoSlice = MojimotoDocument, C = unknown> = ComponentType<
  SliceComponentProps<T, C>
>;

/** A map of content-type api id → the component that renders it. */
export type SliceComponents<C = unknown> = Record<string, SliceComponent<MojimotoDocument, C>>;

/** A map of block type → the component that renders it, for blocks fields. */
export type BlockComponents<C = unknown> = Record<string, SliceComponent<MojimotoBlock, C>>;

export interface SliceZoneProps<C = unknown, T extends MojimotoSlice = MojimotoDocument> {
  /** The blocks or section entries to render, in order (e.g. `page.data.sections`). */
  slices: NoInfer<T>[] | null | undefined;
  /** Maps each slice's `type` to its component. */
  components: Record<string, SliceComponent<T, C>>;
  /** Optional value passed to every slice component as `context`. */
  context?: C;
  /** Rendered for slices whose `type` has no component. Defaults to nothing. */
  fallback?: SliceComponent<T, C>;
}

/**
 * A reference is only renderable once the delivery API has resolved it into a
 * full document (it carries `data`); beyond the depth budget it arrives as a
 * lightweight `{ id, type, uid }` stub, which we skip.
 */
function isRenderable<T extends MojimotoSlice>(slice: unknown): slice is T {
  return (
    typeof slice === 'object' &&
    slice !== null &&
    'type' in slice &&
    'data' in slice &&
    typeof (slice as MojimotoSlice).type === 'string'
  );
}

/**
 * Renders an ordered list of section documents by mapping each one's content
 * type to a component. This is the same primitive used to render pages and to
 * render a single section in the preview route, so previews match production.
 *
 * ```tsx
 * import { SliceZone } from '@mojimoto/react';
 * import { MarketingHero, ContentBlock, TeamGrid } from '@/cms/sections';
 *
 * <SliceZone
 *   slices={page.data.sections}
 *   components={{ marketing_hero: MarketingHero, content_block: ContentBlock, team_grid: TeamGrid }}
 * />
 * ```
 */
export function SliceZone<C = unknown, T extends MojimotoSlice = MojimotoDocument>({ slices, components, context, fallback }: SliceZoneProps<C, T>): ReactNode {
  const renderable = (slices ?? []).filter((slice): slice is T => isRenderable<T>(slice));

  if (renderable.length === 0) {
    return null;
  }

  return (
    <>
      {renderable.map((slice, index) => {
        const Component = components[slice.type] ?? fallback;

        if (!Component) {
          if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
            console.warn(
              `[mojimoto] <SliceZone> has no component for slice type "${slice.type}" (id ${slice.id}). ` +
                'Add it to `components` or pass a `fallback`.',
            );
          }
          return null;
        }

        return (
          <Fragment key={`${slice.type}-${slice.id}-${index}`}>
            <Component slice={slice} index={index} slices={renderable} context={context as C} />
          </Fragment>
        );
      })}
    </>
  );
}
