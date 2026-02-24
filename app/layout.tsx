import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'AuraCode — AI-Powered React Coding Competitions',
  description: 'Compete in live React challenges, get Gemini AI scoring across 5 rubric categories, pair-program with an AI coach, and climb the global leaderboard — all in your browser.',
  generator: 'AuraCode',
  keywords: ['React', 'coding competition', 'AI evaluation', 'Gemini', 'hackathon', 'developer challenge'],
  openGraph: {
    title: 'AuraCode — AI-Powered React Coding Competitions',
    description: 'Compete, build, and get AI-scored in real-time React challenges.',
    type: 'website',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
