<script setup lang="ts">
function openDashboard() {
  browser.tabs.create({
    url: browser.runtime.getURL('/dashboard.html'),
  })
}

function openPortal() {
  browser.tabs.create({
    url: 'https://v.ruc.edu.cn/',
  })
}
</script>

<template>
  <main class="w-72 bg-neutral-950 p-4 text-neutral-100">
    <h2 class="text-lg font-semibold">微人大 ++</h2>

    <div class="mt-4 space-y-2">
      <button
        class="w-full rounded-lg bg-neutral-800 px-3 py-2 text-left hover:bg-neutral-700"
        @click="openDashboard"
      >
        打开 Dashboard
      </button>

      <button
        class="w-full rounded-lg bg-neutral-800 px-3 py-2 text-left hover:bg-neutral-700"
        @click="openPortal"
      >
        打开微人大
      </button>
    </div>
  </main>
</template>