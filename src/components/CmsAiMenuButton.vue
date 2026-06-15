<template>
  <Dropdown placement="bottom-end">
    <template #trigger>
      <Button
        variant="secondary"
        size="sm"
        data-testid="cms-ai-menu"
      >
        {{ $t('cmsAi.menu') }}
      </Button>
    </template>
    <template #default="{ close }">
      <div
        v-for="action in ACTIONS"
        :key="action"
        class="vbwd-dropdown-item"
        :data-testid="`cms-ai-action-${action}`"
        @click="onSelect(action, close)"
      >
        {{ $t(`cmsAi.actions.${action}`) }}
      </div>
    </template>
  </Dropdown>
</template>

<script setup lang="ts">
import { Button, Dropdown } from 'vbwd-view-component';
import { selectAction, type CmsAiAction } from '../cmsAiPanelState';
import type { CmsEditorContext } from '../../../cms-admin/src/editor/cmsEditorExtensionRegistry';

// The editor context is provided by the host seam; the menu only needs it to
// satisfy the seam contract (the panel is the active consumer).
defineProps<{ context: CmsEditorContext }>();

const ACTIONS: CmsAiAction[] = ['article', 'seo', 'restyle'];

function onSelect(action: CmsAiAction, close: () => void): void {
  selectAction(action);
  close();
}
</script>
