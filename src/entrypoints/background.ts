import { storage } from 'wxt/utils/storage'
import { fetchGrades } from '@/services/grades'

type VisitedPage = {
  title: string
  url: string
  time: number
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(async (message) => {
    if (message?.type === 'RUC_GRADES_QUERY') {
      return await fetchGrades()
    }

    if (message?.type !== 'RUC_PAGE_VISITED') return

    const page = message.payload as VisitedPage
    const key = 'local:recent-pages'

    const recent = await storage.getItem<VisitedPage[]>(key) ?? []

    const next = [
      page,
      ...recent.filter((item) => item.url !== page.url),
    ].slice(0, 20)

    await storage.setItem(key, next)
  })
})