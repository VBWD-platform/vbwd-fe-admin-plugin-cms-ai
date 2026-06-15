import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { ref } from 'vue';
import CmsAiMenuButton from '../../src/components/CmsAiMenuButton.vue';
import { getCmsAiPanelState, selectAction } from '../../src/cmsAiPanelState';
import type { CmsEditorContext } from '../../../cms-admin/src/editor/cmsEditorExtensionRegistry';
import en from '../../locales/en.json';

vi.mock('@/api', () => ({ api: { post: vi.fn() } }));

const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en } });

function stubContext(): CmsEditorContext {
  return {
    form: ref<Record<string, unknown>>({}),
    applyPatch: () => {},
    getContext: () => ({ title: '', excerpt: '', content_html: '', type: 'post' }),
  };
}

function mountButton(): VueWrapper {
  return mount(CmsAiMenuButton, {
    props: { context: stubContext() },
    global: { plugins: [i18n] },
  });
}

describe('CmsAiMenuButton.vue', () => {
  beforeEach(() => {
    selectAction('article');
    getCmsAiPanelState().open = false;
  });

  it('renders the AI menu trigger', () => {
    const wrapper = mountButton();
    expect(wrapper.find('[data-testid="cms-ai-menu"]').exists()).toBe(true);
  });

  it('shows the three actions when opened', async () => {
    const wrapper = mountButton();
    await wrapper.find('[data-testid="cms-ai-menu"]').trigger('click');
    expect(wrapper.find('[data-testid="cms-ai-action-article"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="cms-ai-action-seo"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="cms-ai-action-restyle"]').exists()).toBe(true);
  });

  it('selecting "article" turns read-excerpt on and opens the panel', async () => {
    getCmsAiPanelState().readExcerpt = false;
    getCmsAiPanelState().open = false;
    const wrapper = mountButton();
    await wrapper.find('[data-testid="cms-ai-menu"]').trigger('click');
    await wrapper.find('[data-testid="cms-ai-action-article"]').trigger('click');
    const state = getCmsAiPanelState();
    expect(state.action).toBe('article');
    expect(state.readExcerpt).toBe(true);
    expect(state.open).toBe(true);
  });

  it('selecting "seo" sets the action and opens the panel with read-excerpt off', async () => {
    const wrapper = mountButton();
    await wrapper.find('[data-testid="cms-ai-menu"]').trigger('click');
    await wrapper.find('[data-testid="cms-ai-action-seo"]').trigger('click');
    const state = getCmsAiPanelState();
    expect(state.action).toBe('seo');
    expect(state.readExcerpt).toBe(false);
    expect(state.open).toBe(true);
  });
});
