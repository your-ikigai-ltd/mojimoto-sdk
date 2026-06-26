import { type ComponentType, Fragment, type ReactNode } from 'react';
import type { MojimotoDocument } from '@mojimoto/client';

// `process` may be absent in the browser; bundlers (Next, Vite) replace
// `process.env.NODE_ENV` at build time. Declared locally to avoid pulling in
// @types/node for one dev-only warning.
declare const process: { env: { NODE_ENV?: string } } | undefined;

/**
 * Props every slice component receives. A "slice" is a referenced
 * {@link MojimotoDocument} — the entries linked into a page's References field
 * (what the CMS editor shows as a draggable list of sections).
 */
export interface SliceComponentProps<T extends MojimotoDocument = MojimotoDocument, C = unknown> {
  /** The section document being rendered. */
  slice: T;
  /** Its position within the zone (0-based). */
  index: number;
  /** All renderable slices in the zone, for cross-slice awareness. */
  slices: MojimotoDocument[];
  /** Arbitrary value threaded through from `<SliceZone context={...} />`. */
  context: C;
}

/** A component that renders one slice type. */
// Per-type components are stored under a string key, so the registry is
// intentionally loose on the document generic.
export type SliceComponent<T extends MojimotoDocument = MojimotoDocument, C = unknown> = ComponentType<
  SliceComponentProps<T, C>
>;

/** A map of content-type api id → the component that renders it. */
export type SliceComponents<C = unknown> = Record<string, SliceComponent<MojimotoDocument, C>>;

export interface SliceZoneProps<C = unknown> {
  /** The section documents to render, in order (e.g. `page.data.sections`). */
  slices: MojimotoDocument[] | null | undefined;
  /** Maps each slice's `type` to its component. */
  components: SliceComponents<C>;
  /** Optional value passed to every slice component as `context`. */
  context?: C;
  /** Rendered for slices whose `type` has no component. Defaults to nothing. */
  fallback?: SliceComponent<MojimotoDocument, C>;
}

/**
 * A reference is only renderable once the delivery API has resolved it into a
 * full document (it carries `data`); beyond the depth budget it arrives as a
 * lightweight `{ id, type, uid }` stub, which we skip.
 */
function isRenderable(slice: unknown): slice is MojimotoDocument {
  return (
    typeof slice === 'object' &&
    slice !== null &&
    'type' in slice &&
    'data' in slice &&
    typeof (slice as MojimotoDocument).type === 'string'
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
export function SliceZone<C = unknown>({ slices, components, context, fallback }: SliceZoneProps<C>): ReactNode {
  const renderable = (slices ?? []).filter(isRenderable);

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
