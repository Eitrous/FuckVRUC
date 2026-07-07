import {
  DEFAULT_SHOW_DASHBOARD_BUTTON,
  SHOW_DASHBOARD_BUTTON_STORAGE_KEY,
} from '@/utils/settings';

export default defineContentScript({
  matches: ['https://v.ruc.edu.cn/*'],
  main() {
    const rootId = 'fuckvruc-root';
    const existingHost = document.getElementById(rootId);

    existingHost?.remove();

    const host = document.createElement('div');
    host.id = rootId;
    document.body.append(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
      }

      .dashboard-link {
        position: fixed;
        right: 24px;
        bottom: 24px;
        z-index: 2147483647;
        border: 1px solid #901818;
        background: #901818;
        color: #fff;
        padding: 10px 14px;
        font: 600 14px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        cursor: pointer;
        box-shadow: 0 8px 24px rgb(0 0 0 / 16%);
      }

      .dashboard-link:hover {
        background: #761313;
        border-color: #761313;
      }

      .dashboard-link[hidden] {
        display: none;
      }
    `;

    const button = document.createElement('button');
    button.className = 'dashboard-link';
    button.type = 'button';
    button.hidden = true;
    button.textContent = '打开微人大 ++';
    button.addEventListener('click', () => {
      browser.runtime.sendMessage({ type: 'RUC_DASHBOARD_OPEN' });
    });

    shadow.append(style, button);

    function setButtonVisible(visible: boolean) {
      button.hidden = !visible;
    }

    async function syncButtonVisibility() {
      const settings = await browser.storage.local.get(
        SHOW_DASHBOARD_BUTTON_STORAGE_KEY,
      );
      const storedValue = settings[SHOW_DASHBOARD_BUTTON_STORAGE_KEY];

      setButtonVisible(
        typeof storedValue === 'boolean'
          ? storedValue
          : DEFAULT_SHOW_DASHBOARD_BUTTON,
      );
    }

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') {
        return;
      }

      const change = changes[SHOW_DASHBOARD_BUTTON_STORAGE_KEY];

      if (!change) {
        return;
      }

      setButtonVisible(
        typeof change.newValue === 'boolean'
          ? change.newValue
          : DEFAULT_SHOW_DASHBOARD_BUTTON,
      );
    });

    void syncButtonVisibility();
  },
});
