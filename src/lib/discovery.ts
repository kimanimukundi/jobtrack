import Parser from 'rss-parser'
import * as cheerio from 'cheerio'
import { createAdminClient } from './supabase'
import type { Job, JobType } from '@/types'

const rssParser = new Parser()

// ─────────────────────────────────────────
// RSS FEED FETCHER
// ─────────────────────────────────────────
export async function fetchRSSFeed(url: string, sourceName: string): Promise<Partial<Job>[]> {
  try {
    const feed = await rssParser.parseURL(url)
    return feed.items.map(item => ({
      title: item.title || 'Untitled',
      company: extractCompanyFromRSS(item, sourceName),
      source_name: sourceName,
      source_url: item.link || url,
      apply_url: item.link || undefined,
      description: item.contentSnippet || item.summary || undefined,
      external_id: item.guid || item.link || undefined,
      posted_at: item.pubDate ? new Date(item.pubDate).toISOString() : undefined,
      type: detectJobType(item.title || '', item.contentSnippet || ''),
      location: 'Kenya',
    }))
  } catch (err) {
    console.error(`RSS fetch failed for ${url}:`, err)
    return []
  }
}

function extractCompanyFromRSS(item: any, sourceName: string): string {
  if (item['dc:publisher']) return item['dc:publisher']
  if (item.author) return item.author
  const match = item.title?.match(/at (.+?)(?:\s*[-|]|$)/i)
  if (match) return match[1].trim()
  return sourceName
}

// ─────────────────────────────────────────
// JSEARCH API (RapidAPI free tier)
// ─────────────────────────────────────────
export async function fetchJSearch(query: string, page = 1): Promise<Partial<Job>[]> {
  const key = process.env.RAPIDAPI_KEY
  if (!key) {
    console.warn('No RapidAPI key set, skipping JSearch')
    return []
  }

  try {
    const params = new URLSearchParams({
      query: `${query} Kenya`,
      page: String(page),
      num_pages: '1',
      date_posted: 'month',
    })

    const res = await fetch(`https://jsearch.p.rapidapi.com/search?${params}`, {
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      },
    })

    if (!res.ok) throw new Error(`JSearch error: ${res.status}`)
    const data = await res.json()

    return (data.data || []).map((item: any): Partial<Job> => ({
      title: item.job_title,
      company: item.employer_name,
      location: item.job_city ? `${item.job_city}, Kenya` : 'Kenya',
      description: item.job_description?.slice(0, 500),
      apply_url: item.job_apply_link,
      source_name: item.job_publisher || 'JSearch',
      source_url: item.job_apply_link,
      external_id: item.job_id,
      posted_at: item.job_posted_at_datetime_utc,
      deadline: item.job_offer_expiration_datetime_utc
        ? new Date(item.job_offer_expiration_datetime_utc).toISOString().split('T')[0]
        : undefined,
      type: detectJobType(item.job_title, item.job_description || ''),
      salary: item.job_min_salary
        ? `${item.job_min_salary}–${item.job_max_salary} ${item.job_salary_currency || 'KES'}`
        : undefined,
    }))
  } catch (err) {
    console.error('JSearch fetch failed:', err)
    return []
  }
}

// ─────────────────────────────────────────
// CUSTOM URL SCRAPER
// Fetches a careers page and extracts job listings using heuristics
// ─────────────────────────────────────────
export async function scrapeCareerPage(url: string, siteName: string): Promise<Partial<Job>[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobTrackBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    const $ = cheerio.load(html)
    const jobs: Partial<Job>[] = []

    // Common job listing selectors
    const selectors = [
      '.job-listing', '.job-post', '.career-item', '.vacancy',
      '[class*="job"]', '[class*="career"]', '[class*="vacancy"]',
      'article', 'li.position',
    ]

    for (const sel of selectors) {
      const els = $(sel)
      if (els.length >= 2 && els.length <= 50) {
        els.each((_, el) => {
          const $el = $(el)
          const title = $el.find('h1,h2,h3,h4,a').first().text().trim()
          const link = $el.find('a').first().attr('href')
          const desc = $el.find('p').first().text().trim()

          if (title && title.length > 5 && title.length < 150) {
            const fullUrl = link
              ? link.startsWith('http') ? link : new URL(link, url).href
              : url

            jobs.push({
              title,
              company: siteName,
              description: desc || undefined,
              apply_url: fullUrl,
              source_name: siteName,
              source_url: url,
              external_id: `${siteName}-${title}`.toLowerCase().replace(/\s+/g, '-'),
              type: detectJobType(title, desc),
              location: 'Kenya',
              discovered_at: new Date().toISOString(),
            })
          }
        })
        if (jobs.length > 0) break
      }
    }

    return jobs.slice(0, 30)
  } catch (err) {
    console.error(`Scrape failed for ${url}:`, err)
    return []
  }
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
export function detectJobType(title: string, description: string): JobType {
  const text = `${title} ${description}`.toLowerCase()
  if (/intern(ship)?/.test(text)) return 'internship'
  if (/attachment|industrial.attach|student.attach/.test(text)) return 'attachment'
  if (/tender|procurement|supply of|provision of|rfp|rfq|bid/.test(text)) return 'tender'
  return 'job'
}

// ─────────────────────────────────────────
// UPSERT JOBS TO DATABASE
// ─────────────────────────────────────────
export async function upsertJobs(jobs: Partial<Job>[], siteId?: string): Promise<number> {
  if (!jobs.length) return 0
  const supabase = createAdminClient()

  const toInsert = jobs.map(j => ({
    ...j,
    source_site_id: siteId || null,
    discovered_at: new Date().toISOString(),
  }))

  const { data, error } = await supabase
    .from('jobs')
    .upsert(toInsert, {
      onConflict: 'external_id,source_name',
      ignoreDuplicates: true,
    })
    .select('id')

  if (error) {
    console.error('Upsert error:', error)
    return 0
  }

  return data?.length || 0
}

// ─────────────────────────────────────────
// NOTIFY USERS who track a site that had new jobs
// ─────────────────────────────────────────
export async function notifyUsersForSite(siteId: string, newCount: number, siteName: string) {
  if (newCount === 0) return
  const supabase = createAdminClient()

  const { data: trackers } = await supabase
    .from('tracked_sites')
    .select('user_id')
    .eq('id', siteId)
    .eq('is_active', true)

  if (!trackers?.length) return

  const notifications = trackers.map(t => ({
    user_id: t.user_id,
    title: `${newCount} new posting${newCount > 1 ? 's' : ''} on ${siteName}`,
    message: `${siteName} just posted ${newCount} new opportunit${newCount > 1 ? 'ies' : 'y'}.`,
  }))

  await supabase.from('notifications').insert(notifications)
}
