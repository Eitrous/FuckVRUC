// src/services/service-index.ts
import type { PortalService } from '@/types/service'

export async function resolveMailUrl(): Promise<string> {
    try {
        const res = await fetch('https://v.ruc.edu.cn/schoolcard/MailCard/')
        const json = await res.json()

        if (json?.data?.length > 0) {
            const ssoUrl: string = json.data[0].sso_url
            if (ssoUrl) {
                return 'https://v.ruc.edu.cn/' + ssoUrl
            }
        }
    } catch (error) {
        // console.error('Failed to resolve mail URL:', error)
    }
    return '';
    
}

export const builtinServices: PortalService[] = [
  {
    id: 'jw',
    name: '教务系统',
    description: '选课、成绩、培养方案等',
    url: 'https://jw.ruc.edu.cn/Njw2017/index.html#/',
    category: 'study',
    keywords: ['教务', '选课', '成绩', '培养方案', '考试'],
    sensitive: true,
    source: 'manual',
  },
  {
    id: 'library',
    name: '图书馆',
    description: '预约座位',
    url: 'https://zwlib.ruc.edu.cn/',
    category: 'library',
    keywords: ['图书馆', '借书', '数据库', '论文'],
    source: 'manual',
  },
  {
    id: 'mail',
    name: '邮箱',
    description: '学校邮箱',
    url: '',
    category: 'other',
    keywords: ['邮箱', '邮件', '通知'],
    source: 'manual',
  },
  {
    id: 'network',
    name: '校园网',
    description: '校园网认证、流量查询',
    url: 'https://go.ruc.edu.cn/',
    category: 'network',
    keywords: ['校园网', '认证', '流量'],
    source: 'manual',
  },
  {
    id: 'k',
    name: '未来课堂',
    description: '教学资源、课程学习',
    url: 'https://k.ruc.edu.cn/',
    category: 'study',
    keywords: ['未来课堂', '教学资源', '课程学习'],
    source: 'manual',
  },
  {
    id: 'iss',
    name: '暑期国际学校',
    description: '小学期',
    url: 'https://jw.ruc.edu.cn/Minjw/#/dashboard',
    category: 'study',
    keywords: ['暑期国际学校', '小学期'],
    source: 'manual',
  },
  {
    id: 'rucourse',
    name: 'RUCourse',
    description: '选课指南',
    url: 'http://10.97.25.119',
    category: 'study',
    keywords: ['选课指南', 'RUCourse', '选课', 'rucourse'],
    source: 'manual',
  }
]