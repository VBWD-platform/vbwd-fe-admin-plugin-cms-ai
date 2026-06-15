/**
 * cms-ai — fe-admin plugin (S41 Slice 3).
 *
 * Injects an AI helper into the unified CMS editor (PostEditor.vue) through the
 * AI-agnostic editor seams that cms-admin exposes:
 *   - the AI ✨ dropdown into `cmsEditorHeaderActions`,
 *   - the collapsible AI panel into `cmsEditorPanels`.
 *
 * cms-admin knows nothing about AI; this plugin depends on cms-admin's stable
 * editor-seam registry only. The browser never holds the LLM key — the panel
 * posts to the backend cms-ai proxy (`/plugins/cms-ai/generate[-image]`).
 *
 * Named export per the fe-admin plugin convention.
 */
import type { IPlugin, IPlatformSDK } from 'vbwd-view-component';
import {
  registerCmsEditorHeaderAction,
  registerCmsEditorPanel,
} from '../cms-admin/src/editor/cmsEditorExtensionRegistry';
import CmsAiMenuButton from './src/components/CmsAiMenuButton.vue';
import CmsAiPanel from './src/components/CmsAiPanel.vue';

import en from './locales/en.json';
import de from './locales/de.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';
import ru from './locales/ru.json';
import th from './locales/th.json';
import zh from './locales/zh.json';

const LOCALES: Record<string, Record<string, unknown>> = { en, de, es, fr, ja, ru, th, zh };

export const cmsAiPlugin: IPlugin = {
  name: 'cms-ai',
  version: '1.0.0',
  description: 'AI helper for the CMS editor — content, SEO and image generation.',

  install(sdk: IPlatformSDK) {
    for (const [locale, messages] of Object.entries(LOCALES)) {
      sdk.addTranslations(locale, { cmsAi: (messages as Record<string, unknown>)['cmsAi'] });
    }

    registerCmsEditorHeaderAction(CmsAiMenuButton);
    registerCmsEditorPanel(CmsAiPanel);
  },

  activate() {
    /* seams are registered at install; nothing to toggle */
  },

  deactivate() {
    /* no-op — the editor seams ignore an absent plugin (empty registry) */
  },
};

export default cmsAiPlugin;
