<template>
  <details
    class="cms-ai-panel form-section"
    data-testid="cms-ai-panel"
    :open="panelState.open"
    @toggle="onToggle"
  >
    <summary class="cms-ai-panel__summary">
      {{ $t('cmsAi.panelTitle') }}
    </summary>

    <div class="cms-ai-panel__body">
      <textarea
        v-model="prompt"
        class="cms-ai-panel__prompt"
        rows="3"
        data-testid="cms-ai-prompt"
        :placeholder="$t('cmsAi.promptPlaceholder')"
      />

      <label class="cms-ai-panel__check">
        <input
          v-model="panelState.readExcerpt"
          type="checkbox"
          data-testid="cms-ai-read-excerpt"
        >
        {{ $t('cmsAi.readExcerpt') }}
      </label>

      <label
        v-if="imageEnabled"
        class="cms-ai-panel__check"
      >
        <input
          v-model="imageOnly"
          type="checkbox"
          data-testid="cms-ai-image-only"
        >
        {{ $t('cmsAi.imageOnly') }}
      </label>

      <div class="cms-ai-panel__actions">
        <Button
          variant="primary"
          size="sm"
          :loading="loading"
          data-testid="cms-ai-generate"
          @click="generate"
        >
          {{ loading ? $t('cmsAi.generating') : $t('cmsAi.generate') }}
        </Button>
      </div>

      <Alert
        v-if="error"
        variant="error"
        :message="error"
        data-testid="cms-ai-error"
        class="cms-ai-panel__error"
      />
    </div>
  </details>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Alert, Button } from 'vbwd-view-component';
import { api } from '@/api';
import { getCmsAiPanelState } from '../cmsAiPanelState';
import type { CmsEditorContext, CmsEditorPatch } from '../../../cms-admin/src/editor/cmsEditorExtensionRegistry';

const props = withDefaults(
  defineProps<{
    context: CmsEditorContext;
    /** Whether image generation is enabled (mirrors the backend `image_enabled`). */
    imageEnabled?: boolean;
  }>(),
  { imageEnabled: true },
);

const { t } = useI18n();

const GENERATE_URL = '/plugins/cms-ai/generate';
const GENERATE_IMAGE_URL = '/plugins/cms-ai/generate-image';
// LLM + image generation are inherently slow (a full restyle/article can take
// tens of seconds, image gen longer); override the api client's 30s default so
// the request is not aborted mid-generation.
const GENERATE_TIMEOUT_MS = 300000;

const panelState = getCmsAiPanelState();
const prompt = ref('');
const imageOnly = ref(false);
const loading = ref(false);
const error = ref('');

function onToggle(event: Event): void {
  panelState.open = (event.target as HTMLDetailsElement).open;
}

async function generate(): Promise<void> {
  if (!prompt.value.trim()) {
    error.value = t('cmsAi.errors.missingPrompt');
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const patch = imageOnly.value ? await generateImage() : await generateFields();
    props.context.applyPatch(patch);
  } catch {
    error.value = t('cmsAi.errors.generic');
  } finally {
    loading.value = false;
  }
}

async function generateFields(): Promise<CmsEditorPatch> {
  const requestContext = props.context.getContext({ readExcerpt: panelState.readExcerpt });
  const response = await api.post<{ patch: CmsEditorPatch }>(
    GENERATE_URL,
    {
      action: panelState.action,
      prompt: prompt.value,
      read_excerpt: panelState.readExcerpt,
      context: requestContext,
    },
    { timeout: GENERATE_TIMEOUT_MS },
  );
  return response.patch ?? {};
}

async function generateImage(): Promise<CmsEditorPatch> {
  // The image is uploaded to the global gallery server-side; the patch only
  // carries the new content_html with the appended <img>.
  const requestContext = props.context.getContext({ readExcerpt: false });
  const response = await api.post<{ patch: CmsEditorPatch }>(
    GENERATE_IMAGE_URL,
    {
      prompt: prompt.value,
      context: { content_html: requestContext.content_html },
    },
    { timeout: GENERATE_TIMEOUT_MS },
  );
  return response.patch ?? {};
}
</script>

<style scoped>
/* Style only through the fe-core design system (shared classes + CSS custom
   properties). No bespoke colours/spacing — inherits the active theme. */
.cms-ai-panel.form-section {
  margin-bottom: 1rem;
  padding: 1rem;
  background: var(--vbwd-color-surface, #f9fafb);
  border: 1px solid var(--vbwd-color-border, #e5e7eb);
  border-radius: var(--vbwd-radius-md, 8px);
}

.cms-ai-panel__summary {
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vbwd-color-text-primary, #374151);
}

.cms-ai-panel__body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.cms-ai-panel__prompt {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  padding: 0.5rem 0.75rem;
  font-family: inherit;
  font-size: 0.9rem;
  color: var(--vbwd-color-text, #374151);
  background: var(--vbwd-color-surface, #fff);
  border: 1px solid var(--vbwd-color-border, #d1d5db);
  border-radius: var(--vbwd-input-radius, 0.375rem);
}

.cms-ai-panel__prompt:focus {
  outline: none;
  border-color: var(--vbwd-color-primary, #3b82f6);
  box-shadow: 0 0 0 3px var(--vbwd-color-primary-light, rgba(59, 130, 246, 0.2));
}

.cms-ai-panel__check {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--vbwd-color-text-secondary, #4b5563);
}

.cms-ai-panel__actions {
  display: flex;
  gap: 0.5rem;
}

.cms-ai-panel__error {
  margin-top: 0.25rem;
}
</style>
