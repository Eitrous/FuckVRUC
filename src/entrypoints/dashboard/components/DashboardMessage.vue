<script setup lang="ts">
type MessageType = "info" | "warning";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    text: string;
    type?: MessageType;
  }>(),
  {
    type: "info",
  },
);

const emit = defineEmits<{
  (event: "close"): void;
}>();
</script>

<template>
  <Teleport to="body">
    <Transition name="dashboard-message">
      <div
        v-if="props.visible"
        class="dashboard-message"
        :class="`is-${props.type}`"
        :role="props.type === 'warning' ? 'alert' : 'status'"
        :aria-live="props.type === 'warning' ? 'assertive' : 'polite'"
        aria-atomic="true"
      >
        <span class="message-icon" aria-hidden="true">
          <span v-if="props.type === 'warning'">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="2.6em"
              height="2.6em"
              viewBox="0 0 256 256"
            >
              <path d="M0 0h256v256H0z" fill="none" />
              <path
                fill="currentColor"
                d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m-8 56a8 8 0 0 1 16 0v56a8 8 0 0 1-16 0Zm8 104a12 12 0 1 1 12-12a12 12 0 0 1-12 12"
              />
            </svg>
          </span>
          <span v-else-if="props.type === 'info'">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="2.6em"
              height="2.6em"
              viewBox="0 0 256 256"
            >
              <path d="M0 0h256v256H0z" fill="none" />
              <path
                fill="currentColor"
                d="M108 84a16 16 0 1 1 16 16a16 16 0 0 1-16-16m128 44A108 108 0 1 1 128 20a108.12 108.12 0 0 1 108 108m-24 0a84 84 0 1 0-84 84a84.09 84.09 0 0 0 84-84m-72 36.68V132a20 20 0 0 0-20-20a12 12 0 0 0-4 23.32V168a20 20 0 0 0 20 20a12 12 0 0 0 4-23.32"
              />
            </svg>
          </span>
        </span>

        <span class="message-text">{{ props.text }}</span>

        <button
          class="message-close"
          type="button"
          aria-label="关闭提示"
          @click="emit('close')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="0.8em"
            height="0.8em"
            viewBox="0 0 256 256"
          >
            <path d="M0 0h256v256H0z" fill="none" />
            <path
              fill="currentColor"
              d="M208.49 191.51a12 12 0 0 1-17 17L128 145l-63.51 63.49a12 12 0 0 1-17-17L111 128L47.51 64.49a12 12 0 0 1 17-17L128 111l63.51-63.52a12 12 0 0 1 17 17L145 128Z"
            />
          </svg>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dashboard-message {
  position: fixed;
  top: max(16px, env(safe-area-inset-top));
  left: 50%;
  z-index: 100;
  transform: translateX(-50%);

  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 24px;
  align-items: center;
  gap: 10px;

  width: max-content;
  max-width: calc(100vw - 32px);
  min-width: min(320px, calc(100vw - 32px));
  padding: 12px 14px;

  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  box-shadow: 0 12px 32px rgb(31 26 26 / 18%);
}

.dashboard-message.is-warning {
  color: #754800;
  background: #fff8e8;
  border-color: #c47a00;
}

.message-icon {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  font-weight: 700;
}

.message-icon svg {
  width: 100%;
  height: 100%;
}

.message-text {
  font-size: 14px;
  line-height: 1.5;
}

.message-close {
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.dashboard-message-enter-active,
.dashboard-message-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.dashboard-message-enter-from,
.dashboard-message-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px);
}
</style>
