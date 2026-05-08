export type JobType = 'job' | 'internship' | 'attachment' | 'tender'
export type JobStatus = 'saved' | 'applied' | 'shortlisted' | 'rejected'
export type SiteType = 'website' | 'rss' | 'twitter' | 'linkedin' | 'telegram'
export type SiteCategory = 'job' | 'internship' | 'attachment' | 'tender' | 'all'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  email_notifications: boolean
  created_at: string
}

export interface Job {
  id: string
  source_site_id: string | null
  source_name: string | null
  source_url: string | null
  external_id: string | null
  title: string
  company: string
  location: string
  type: JobType
  description: string | null
  requirements: string | null
  salary: string | null
  deadline: string | null
  apply_url: string | null
  posted_at: string | null
  discovered_at: string
  is_active: boolean
}

export interface SavedJob {
  id: string
  user_id: string
  job_id: string
  status: JobStatus
  notes: string | null
  saved_at: string
  job?: Job
}

export interface TrackedSite {
  id: string
  user_id: string
  name: string
  url: string
  type: SiteType
  category: SiteCategory
  check_interval_hours: number
  last_checked_at: string | null
  last_found_count: number
  is_active: boolean
  created_at: string
}

export interface SystemSource {
  id: string
  name: string
  url: string
  type: string
  rss_url: string | null
  category: string
  is_active: boolean
  last_checked_at: string | null
}

export interface Notification {
  id: string
  user_id: string
  job_id: string | null
  title: string
  message: string | null
  is_read: boolean
  created_at: string
  job?: Job
}

export interface JobFilters {
  type?: JobType | 'all'
  search?: string
  location?: string
  source?: string
  deadline?: 'any' | 'week' | 'month'
}
