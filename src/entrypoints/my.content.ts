import './hide.css';
import {
  DEFAULT_SIMPLIFY_MY_RUC,
  SIMPLIFY_MY_RUC_STORAGE_KEY,
} from '@/utils/settings';

const SIMPLIFIED_PAGE_ATTRIBUTE = 'data-fuckvruc-simplified';

export default defineContentScript({
  matches: ['https://my.ruc.edu.cn/*'],
  async main(ctx) {
    let settingsRevision = 0;

    function setSimplificationEnabled(enabled: boolean) {
      document.documentElement.toggleAttribute(
        SIMPLIFIED_PAGE_ATTRIBUTE,
        enabled,
      );
    }

    function handleStorageChange(
      changes: Record<string, { newValue?: unknown }>,
      areaName: string,
    ) {
      if (areaName !== 'local') return;

      const change = changes[SIMPLIFY_MY_RUC_STORAGE_KEY];
      if (!change) return;

      settingsRevision += 1;
      setSimplificationEnabled(
        typeof change.newValue === 'boolean'
          ? change.newValue
          : DEFAULT_SIMPLIFY_MY_RUC,
      );
    }

    browser.storage.onChanged.addListener(handleStorageChange);
    ctx.onInvalidated(() => {
      browser.storage.onChanged.removeListener(handleStorageChange);
      document.documentElement.removeAttribute(SIMPLIFIED_PAGE_ATTRIBUTE);
    });

    const revisionBeforeLoad = settingsRevision;

    try {
      const settings = await browser.storage.local.get(
        SIMPLIFY_MY_RUC_STORAGE_KEY,
      );

      if (ctx.isInvalid || settingsRevision !== revisionBeforeLoad) return;

      const storedValue = settings[SIMPLIFY_MY_RUC_STORAGE_KEY];
      setSimplificationEnabled(
        typeof storedValue === 'boolean'
          ? storedValue
          : DEFAULT_SIMPLIFY_MY_RUC,
      );
    } catch (error) {
      // console.error('Failed to load my.ruc simplification setting:', error);

      if (!ctx.isInvalid && settingsRevision === revisionBeforeLoad) {
        setSimplificationEnabled(DEFAULT_SIMPLIFY_MY_RUC);
      }
    }
  },
});
