import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@jobtrack.ke'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://jobtrack.ke'

export async function sendNewJobsEmail(
  to: string,
  userName: string,
  siteName: string,
  jobCount: number,
  jobs: { title: string; company: string; apply_url?: string }[]
) {
  if (!process.env.RESEND_API_KEY) return

  const jobListHtml = jobs
    .slice(0, 5)
    .map(j => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0">
          <strong style="font-size:14px">${j.title}</strong><br>
          <span style="color:#666;font-size:13px">${j.company}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:right">
          ${j.apply_url ? `<a href="${j.apply_url}" style="background:#000;color:#fff;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:12px">Apply</a>` : ''}
        </td>
      </tr>
    `).join('')

  await resend.emails.send({
    from: FROM,
    to,
    subject: `${jobCount} new job${jobCount > 1 ? 's' : ''} on ${siteName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
        <h2 style="font-size:20px;margin-bottom:4px">Hi ${userName},</h2>
        <p style="color:#666;margin-bottom:24px">
          <strong>${siteName}</strong> just posted ${jobCount} new opportunit${jobCount > 1 ? 'ies' : 'y'}.
        </p>
        <table style="width:100%;border-collapse:collapse">
          ${jobListHtml}
        </table>
        ${jobs.length > 5 ? `<p style="color:#999;font-size:13px;margin-top:16px">+${jobs.length - 5} more on the platform</p>` : ''}
        <div style="margin-top:24px">
          <a href="${APP_URL}/jobs" style="background:#000;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">
            View all jobs →
          </a>
        </div>
        <p style="color:#ccc;font-size:11px;margin-top:32px">
          You're receiving this because you track ${siteName} on JobTrack Kenya.<br>
          <a href="${APP_URL}/dashboard" style="color:#999">Manage notifications</a>
        </p>
      </div>
    `,
  })
}

export async function sendWelcomeEmail(to: string, name: string) {
  if (!process.env.RESEND_API_KEY) return

  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Welcome to JobTrack Kenya 🇰🇪',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:24px">Welcome, ${name}!</h1>
        <p style="color:#666">Your account is ready. Here's how to get the most out of JobTrack:</p>
        <ol style="color:#444;line-height:2">
          <li>Browse current IT jobs, internships, and tenders on the <a href="${APP_URL}/jobs">jobs page</a></li>
          <li>Add your own tracked sites — company career pages, RSS feeds, LinkedIn pages</li>
          <li>Save interesting jobs and track your application status</li>
          <li>Get notified when new jobs appear on your tracked sites</li>
        </ol>
        <a href="${APP_URL}/dashboard" style="display:inline-block;margin-top:20px;background:#000;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">
          Go to dashboard →
        </a>
      </div>
    `,
  })
}
