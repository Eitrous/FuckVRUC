<script setup lang="ts">
import { computed, ref } from 'vue'
import { builtinServices, resolveMailUrl } from '@/services/services-index'
import { PortalService } from '@/types/service'
import { useGrades } from '@/composables/useGrades'

const {
  loading,
  error,
  grades,
  fetchedAt,
  queryGrades,
} = useGrades()

const query = ref('')

const filteredServices = computed(() => {
  const q = query.value.trim().toLowerCase()

  if (!q) return builtinServices

  return builtinServices.filter((service) => {
    return (
      service.name.toLowerCase().includes(q) ||
      service.description?.toLowerCase().includes(q) ||
      service.keywords.some((keyword) => keyword.toLowerCase().includes(q))
    )
  })
})

async function openService(service: PortalService) {
  let url = service.url

  if (service.id === 'mail') {
    url = await resolveMailUrl()
  }

  browser.tabs.create({ url })
}
</script>

<template>
  <main class="min-h-screen bg-neutral-950 text-neutral-100">
    <section class="mx-auto max-w-6xl px-6 py-10">
      <header class="mb-8">
        <h1 class="mt-2 text-3xl font-semibold">微人大 ++ | Dashboard</h1>
      </header>

      <input
        v-model="query"
        class="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 outline-none"
        placeholder="搜索：课表、成绩、图书馆、校园卡、网络服务..."
      />

      <section class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="service in filteredServices"
          :key="service.id"
          class="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 text-left hover:bg-neutral-800"
          @click="openService(service)"
        >
          <h2 class="text-lg font-medium">{{ service.name }}</h2>
          <p class="mt-2 text-sm text-neutral-400">
            {{ service.description }}
          </p>
        </button>
      </section>
    </section>
    <section class="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-medium">成绩查询</h2>
        <p class="mt-1 text-sm text-neutral-400">
          仅在本地浏览器中查询和展示，不上传数据。
        </p>
      </div>

      <button
        class="rounded-lg bg-neutral-100 px-4 py-2 text-sm text-neutral-950 disabled:opacity-50"
        :disabled="loading"
        @click="queryGrades()"
      >
        {{ loading ? '查询中...' : '查询成绩' }}
      </button>
    </div>

    <p v-if="error" class="mt-4 text-sm text-red-400">
      {{ error }}
    </p>

    <p v-if="fetchedAt" class="mt-4 text-xs text-neutral-500">
      更新时间：{{ new Date(fetchedAt).toLocaleString() }}
    </p>

    <div v-if="grades.length" class="mt-5 overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-neutral-800 text-neutral-400">
          <tr>
            <th class="py-2">课程</th>
            <th class="py-2">学分</th>
            <th class="py-2">成绩</th>
            <th class="py-2">绩点</th>
            <th class="py-2">学期</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="item in grades"
            :key="`${item.semester}-${item.courseCode}-${item.courseName}`"
            class="border-b border-neutral-800"
          >
            <td class="py-2">{{ item.courseName }}</td>
            <td class="py-2">{{ item.credit ?? '-' }}</td>
            <td class="py-2">{{ item.score || '-' }}</td>
            <td class="py-2">{{ item.gradePoint ?? '-' }}</td>
            <td class="py-2">{{ item.semester ?? '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
  </main>
</template>