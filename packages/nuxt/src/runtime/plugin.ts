import { createClient } from '@mojimoto/client';
import { createMojimoto } from '@mojimoto/vue';
import { defineNuxtPlugin, useCookie, useRuntimeConfig } from '#imports';

/**
 * Creates a Mojimoto client from runtime config and registers it (and the Vue
 * component context) on the Nuxt app. Preview mode is enabled by the module
 * option or a `mojimoto_preview` cookie (set by your preview route).
 */
export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();
  const settings = config.public.mojimoto as {
    endpoint: string;
    project: string;
    token: string;
    lang?: string;
    preview?: boolean;
  };

  const previewCookie = useCookie('mojimoto_preview');
  const preview = Boolean(settings.preview) || previewCookie.value === '1';

  const client = createClient({
    endpoint: settings.endpoint,
    project: settings.project,
    token: settings.token,
    lang: settings.lang || undefined,
    preview,
  });

  nuxtApp.vueApp.use(createMojimoto({ client }));

  return {
    provide: { mojimoto: client },
  };
});
