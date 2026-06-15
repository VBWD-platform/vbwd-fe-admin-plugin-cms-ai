import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { ref } from 'vue';
import { api } from '@/api';
import CmsAiPanel from '../../src/components/CmsAiPanel.vue';
import { getCmsAiPanelState, selectAction } from '../../src/cmsAiPanelState';
import type { CmsEditorContext } from '../../../cms-admin/src/editor/cmsEditorExtensionRegistry';
import en from '../../locales/en.json';

vi.mock('@/api', () => ({
  api: { post: vi.fn() },
}));

const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en } });

interface FakeForm {
  title: string;
  excerpt: string;
  content_html: string;
  type: string;
  meta_title: string;
}

function makeContext(overrides: Partial<FakeForm> = {}) {
  const form = ref<FakeForm>({
    title: 'My title',
    excerpt: 'Lead paragraph',
    content_html: '<p>Existing</p>',
    type: 'post',
    meta_title: '',
    ...overrides,
  });
  const customFields = ref<Record<string, unknown>>({});
  const applyPatch = vi.fn((patch: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === undefined) continue;
      if (key in form.value) (form.value as Record<string, unknown>)[key] = value;
      else customFields.value[key] = value;
    }
  });
  const getContext = vi.fn((opts: { readExcerpt: boolean }) => ({
    title: form.value.title,
    excerpt: opts.readExcerpt ? form.value.excerpt : '',
    content_html: form.value.content_html,
    type: form.value.type,
  }));
  const context = { form, applyPatch, getContext } as unknown as CmsEditorContext;
  return { context, form, customFields, applyPatch, getContext };
}

function mountPanel(context: CmsEditorContext, imageEnabled = true): VueWrapper {
  return mount(CmsAiPanel, {
    props: { context, imageEnabled },
    global: { plugins: [i18n] },
  });
}

describe('CmsAiPanel.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset shared state to defaults.
    selectAction('article');
    getCmsAiPanelState().open = false;
  });

  it('renders the prompt textarea (3 rows), read-excerpt + image-only checkboxes, and Generate', () => {
    const { context } = makeContext();
    const wrapper = mountPanel(context);
    const textarea = wrapper.find('[data-testid="cms-ai-prompt"]');
    expect(textarea.exists()).toBe(true);
    expect(textarea.attributes('rows')).toBe('3');
    expect(wrapper.find('[data-testid="cms-ai-read-excerpt"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="cms-ai-image-only"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="cms-ai-generate"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="cms-ai-panel"]').exists()).toBe(true);
  });

  it('hides the image-only checkbox when image generation is disabled', () => {
    const { context } = makeContext();
    const wrapper = mountPanel(context, false);
    expect(wrapper.find('[data-testid="cms-ai-image-only"]').exists()).toBe(false);
  });

  it('posts the built request to /generate and applies the returned patch', async () => {
    (api.post as any).mockResolvedValue({
      patch: { content_html: '<p>Generated</p>', title: 'New title' },
      provider: 'openai',
      model: 'gpt-4o-mini',
    });
    const { context, form, applyPatch } = makeContext();
    const wrapper = mountPanel(context);

    await wrapper.find('[data-testid="cms-ai-prompt"]').setValue('Write about astronomy');
    await wrapper.find('[data-testid="cms-ai-generate"]').trigger('click');
    await flushPromises();

    expect(api.post).toHaveBeenCalledTimes(1);
    const [url, body] = (api.post as any).mock.calls[0];
    expect(url).toBe('/plugins/cms-ai/generate');
    expect(body).toMatchObject({
      action: 'article',
      prompt: 'Write about astronomy',
      read_excerpt: true,
      context: { title: 'My title', excerpt: 'Lead paragraph', content_html: '<p>Existing</p>', type: 'post' },
    });
    expect(applyPatch).toHaveBeenCalledWith({ content_html: '<p>Generated</p>', title: 'New title' });
    expect(form.value.content_html).toBe('<p>Generated</p>');
    expect(form.value.title).toBe('New title');
  });

  it('does not apply null/omitted fields and does not mutate untouched fields', async () => {
    (api.post as any).mockResolvedValue({ patch: { content_html: '<p>Body</p>', meta_title: null } });
    const { context, form } = makeContext();
    const wrapper = mountPanel(context);
    await wrapper.find('[data-testid="cms-ai-prompt"]').setValue('go');
    await wrapper.find('[data-testid="cms-ai-generate"]').trigger('click');
    await flushPromises();
    expect(form.value.content_html).toBe('<p>Body</p>');
    expect(form.value.meta_title).toBe(''); // null in patch → untouched
  });

  it('routes custom-field keys from the patch into custom fields via applyPatch', async () => {
    (api.post as any).mockResolvedValue({ patch: { title: 'T', reading_time: 7 } });
    const { context, customFields } = makeContext();
    const wrapper = mountPanel(context);
    await wrapper.find('[data-testid="cms-ai-prompt"]').setValue('go');
    await wrapper.find('[data-testid="cms-ai-generate"]').trigger('click');
    await flushPromises();
    expect(customFields.value).toEqual({ reading_time: 7 });
  });

  it('renders an inline error when the request fails and does not call applyPatch', async () => {
    (api.post as any).mockRejectedValue(new Error('boom'));
    const { context, applyPatch } = makeContext();
    const wrapper = mountPanel(context);
    await wrapper.find('[data-testid="cms-ai-prompt"]').setValue('go');
    await wrapper.find('[data-testid="cms-ai-generate"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="cms-ai-error"]').exists()).toBe(true);
    expect(applyPatch).not.toHaveBeenCalled();
  });

  it('never auto-saves the post (no save call leaks out of the panel)', async () => {
    (api.post as any).mockResolvedValue({ patch: { content_html: '<p>x</p>' } });
    const { context } = makeContext();
    const wrapper = mountPanel(context);
    await wrapper.find('[data-testid="cms-ai-prompt"]').setValue('go');
    await wrapper.find('[data-testid="cms-ai-generate"]').trigger('click');
    await flushPromises();
    // Only the generate endpoint is hit — no post-save endpoint.
    const urls = (api.post as any).mock.calls.map((c: unknown[]) => c[0]);
    expect(urls).toEqual(['/plugins/cms-ai/generate']);
  });

  it('with image-only ON, posts to /generate-image and applies the returned content_html', async () => {
    (api.post as any).mockResolvedValue({
      patch: { content_html: '<p>Existing</p><img data-cms-image="g1" src="/x.jpg">' },
      image: { id: 'g1', slug: 'g1', url_path: '/x.jpg' },
    });
    const { context, form, applyPatch } = makeContext();
    const wrapper = mountPanel(context);
    await wrapper.find('[data-testid="cms-ai-prompt"]').setValue('a cat in space');
    await wrapper.find('[data-testid="cms-ai-image-only"]').setValue(true);
    await wrapper.find('[data-testid="cms-ai-generate"]').trigger('click');
    await flushPromises();

    const [url, body] = (api.post as any).mock.calls[0];
    expect(url).toBe('/plugins/cms-ai/generate-image');
    expect(body).toMatchObject({ prompt: 'a cat in space', context: { content_html: '<p>Existing</p>' } });
    expect(applyPatch).toHaveBeenCalledWith({
      content_html: '<p>Existing</p><img data-cms-image="g1" src="/x.jpg">',
    });
    expect(form.value.content_html).toContain('data-cms-image="g1"');
  });

  it('reflects the shared action intent set by the menu (seo) in the request', async () => {
    (api.post as any).mockResolvedValue({ patch: { meta_title: 'M' } });
    selectAction('seo');
    const { context } = makeContext();
    const wrapper = mountPanel(context);
    await wrapper.find('[data-testid="cms-ai-prompt"]').setValue('seo please');
    await wrapper.find('[data-testid="cms-ai-generate"]').trigger('click');
    await flushPromises();
    const [, body] = (api.post as any).mock.calls[0];
    expect(body.action).toBe('seo');
    expect(body.read_excerpt).toBe(false); // seo does not default read-excerpt on
  });
});
