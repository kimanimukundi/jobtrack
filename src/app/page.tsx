import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'

export default function HomePage() {
  const features = [
    { icon: '⚡', title: 'Real-time tracking', desc: 'Auto-checks your sources every few hours and adds new jobs instantly' },
    { icon: '🌐', title: 'Any source', desc: 'Add any careers page, RSS feed, LinkedIn page, or social media account' },
    { icon: '🔔', title: 'Instant alerts', desc: 'Get notified the moment a new job appears on a site you track' },
    { icon: '📋', title: 'All in one place', desc: 'Jobs, internships, attachments, and government tenders — unified' },
    { icon: '🇰🇪', title: 'Kenya-focused', desc: 'Built-in sources: Fuzu, BrighterMonday, MyJobMag, PPRA tenders' },
    { icon: '💾', title: 'Save & track status', desc: 'Save jobs and track where you are — saved, applied, shortlisted' },
  ]

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
          <div className="inline-block bg-green-50 text-green-700 text-xs font-medium px-3 py-1 rounded-full border border-green-200 mb-6">
            Free · No credit card required
          </div>
          <h1 className="text-5xl font-semibold tracking-tight leading-tight mb-5">
            Never miss an IT job<br />in Kenya again
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto mb-8">
            JobTrack monitors dozens of job sites, company career pages, and social media accounts — and brings every opportunity to one dashboard.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/auth/signup" className="bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors">
              Get started free
            </Link>
            <Link href="/jobs" className="border border-gray-200 px-6 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
              Browse jobs
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-4 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map(f => (
              <div key={f.title} className="bg-white border border-gray-100 rounded-2xl p-6">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-medium mb-1">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Sources */}
        <section className="border-t border-gray-100 py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-6">Tracks jobs from</p>
            <div className="flex flex-wrap justify-center gap-3">
              {['Fuzu', 'BrighterMonday', 'MyJobMag', 'LinkedIn', 'PPRA Tenders', 'Company Sites', 'Twitter/X', 'RSS Feeds', 'Telegram'].map(s => (
                <span key={s} className="bg-gray-50 border border-gray-100 text-gray-500 text-sm px-4 py-2 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-2xl mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl font-semibold mb-4">Start tracking jobs today</h2>
          <p className="text-gray-500 mb-6">Free forever. No limits on tracked sites or saved jobs.</p>
          <Link href="/auth/signup" className="bg-black text-white px-8 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors">
            Create free account
          </Link>
        </section>
      </main>
    </>
  )
}
