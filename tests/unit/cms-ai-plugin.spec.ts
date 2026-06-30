import { describe, it, expect, beforeEach } from 'vitest';
import { PluginRegistry, PlatformSDK } from 'vbwd-view-component';
import { cmsAiPlugin } from '../../index';
import {
  getCmsEditorHeaderActions,
  getCmsEditorPanels,
  clearCmsEditorExtensions,
} from '../../../cms-admin/src/editor/cmsEditorExtensionRegistry';

describe('cms-ai fe-admin plugin', () => {
  let registry: PluginRegistry;
  let sdk: PlatformSDK;

  beforeEach(() => {
    registry = new PluginRegistry();
    sdk = new PlatformSDK();
    clearCmsEditorExtensions();
    // cms-ai declares `dependencies: ['cms-admin']`, so installAll() resolves
    // the dependency graph and throws "Dependency cms-admin not found" unless a
    // cms-admin plugin is registered first. The editor seam itself is imported
    // directly above, so a no-op stub is enough to satisfy resolution.
    registry.register({ name: 'cms-admin', version: cmsAiPlugin.version, install() {} });
  });

  it('declares correct metadata', () => {
    expect(cmsAiPlugin.name).toBe('cms-ai');
    expect(cmsAiPlugin.version).toBeDefined();
  });

  it('registers a header action and a panel into the cms editor seams on install', async () => {
    registry.register(cmsAiPlugin);
    await registry.installAll(sdk);
    expect(getCmsEditorHeaderActions().length).toBe(1);
    expect(getCmsEditorPanels().length).toBe(1);
  });

  it('loads translations across the fe-admin locale set', async () => {
    registry.register(cmsAiPlugin);
    await registry.installAll(sdk);
    const translations = sdk.getTranslations() as Record<string, Record<string, unknown>>;
    for (const locale of ['en', 'de', 'es', 'fr', 'ja', 'ru', 'th', 'zh']) {
      expect(translations[locale]?.cmsAi).toBeDefined();
    }
  });
});
