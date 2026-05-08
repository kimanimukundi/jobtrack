import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/layout/AuthProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'JobTrack Kenya — IT Jobs, Internships, Attachments & Tenders',
  description: 'Real-time job tracker for IT professionals in Kenya.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider initialSession={null}>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}