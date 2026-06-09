import { addComponent, addImports, addPlugin, createResolver, defineNuxtModule } from '@nuxt/kit';
import type { NuxtModule } from '@nuxt/schema';

export interface ModuleOptions {
  /** Delivery endpoint, e.g. `https://cms.example.com/api/v1`. Falls back to `MOJIMOTO_ENDPOINT`. */
  endpoint?: string;
  /** Project slug. Falls back to `MOJIMOTO_PROJECT`. */
  project?: string;
  /**
   * Read-only delivery token. Falls back to `MOJIMOTO_TOKEN`.
   * Stored in **public** runtime config (it ships to the browser, like a
   * Contentful CDN token). Use a read-scoped token only — never a write token.
   */
  token?: string;
  /** Default locale. */
  lang?: string;
  /** Request draft content by default (needs a preview-capable token). */
  preview?: boolean;
  /** Auto-register `<MojiRichText>` etc. as global components. Default `true`. */
  components?: boolean;
}

const COMPONENTS = ['MojiRichText', 'MojiText', 'MojiImage', 'MojiLink'] as const;
const COMPOSABLES = ['useMojimoto', 'useMojiQuery', 'useMojiDocument'] as const;

const module: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@mojimoto/nuxt',
    configKey: 'mojimoto',
    compatibility: { nuxt: '>=3.0.0' },
  },
  defaults: {
    components: true,
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    const publicConfig = (nuxt.options.runtimeConfig.public.mojimoto ??= {}) as {
      endpoint?: string;
      project?: string;
      token?: string;
      lang?: string;
      preview?: boolean;
    };
    publicConfig.endpoint = options.endpoint ?? process.env.MOJIMOTO_ENDPOINT ?? publicConfig.endpoint ?? '';
    publicConfig.project = options.project ?? process.env.MOJIMOTO_PROJECT ?? publicConfig.project ?? '';
    publicConfig.token = options.token ?? process.env.MOJIMOTO_TOKEN ?? publicConfig.token ?? '';
    publicConfig.lang = options.lang ?? publicConfig.lang ?? '';
    publicConfig.preview = options.preview ?? publicConfig.preview ?? false;

    // The SDK packages publish ESM/CJS; transpile so Nuxt handles them uniformly.
    nuxt.options.build.transpile.push('@mojimoto/vue', '@mojimoto/client', '@mojimoto/richtext');

    addPlugin(resolver.resolve('./runtime/plugin'));

    for (const name of COMPOSABLES) {
      addImports({ name, from: resolver.resolve('./runtime/composables') });
    }

    if (options.components !== false) {
      for (const name of COMPONENTS) {
        addComponent({ name, export: name, filePath: '@mojimoto/vue' });
      }
    }
  },
});

export default module;
