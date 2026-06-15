/**
 * Shared cms-ai panel state.
 *
 * The AI ✨ menu button (header-action slot) and the AI panel (panel slot) are
 * mounted into two SEPARATE editor seams, so they cannot share component props.
 * This tiny reactive singleton is their single source of truth (DRY): the menu
 * button sets the action + opens the panel; the panel reads it.
 *
 * Kept module-local (no Pinia) — it is plugin-internal UI state, the narrowest
 * thing that satisfies the two-slot coordination.
 */
import { reactive } from 'vue';

export type CmsAiAction = 'article' | 'seo' | 'restyle';

interface CmsAiPanelState {
  /** Whether the collapsible panel is open. */
  open: boolean;
  /** The action the next Generate will run. */
  action: CmsAiAction;
  /** Whether the "Read excerpt" checkbox starts on (article default-on). */
  readExcerpt: boolean;
}

const state = reactive<CmsAiPanelState>({
  open: false,
  action: 'article',
  readExcerpt: true,
});

/** Select an action from the menu: sets the intent and opens the panel. */
export function selectAction(action: CmsAiAction): void {
  state.action = action;
  // "Write an article from excerpt" reads the excerpt by default; the other
  // actions start with it off (the operator can still tick it).
  state.readExcerpt = action === 'article';
  state.open = true;
}

export function getCmsAiPanelState(): CmsAiPanelState {
  return state;
}
