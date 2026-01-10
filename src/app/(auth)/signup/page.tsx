'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function SignupForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) {
      setReferralCode(ref)
      sessionStorage.setItem('referral_code', ref)
    }
  }, [searchParams])

  const handleDiscordSignup = async () => {
    setIsLoading(true)
    setError(null)

    const ref = referralCode || sessionStorage.getItem('referral_code')
    const redirectUrl = ref
      ? `${window.location.origin}/callback?redirect=/filings&ref=${ref}`
      : `${window.location.origin}/callback?redirect=/filings`

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: redirectUrl,
        scopes: 'identify email',
      },
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full px-6">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-primary">
            FilingsFlow
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-gray-900">
            Get started free
          </h1>
          <p className="mt-2 text-gray-600">
            Track SEC filings and insider transactions
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <h3 className="font-medium text-green-800">Free tier includes:</h3>
            <ul className="mt-2 text-sm text-green-700 space-y-1">
              <li>• 5 watchlist tickers</li>
              <li>• 24-hour delayed filings</li>
              <li>• Basic search & filtering</li>
              <li>• Web dashboard access</li>
            </ul>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleDiscordSignup}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-[#5865F2] text-white py-3 px-4 rounded-md font-medium hover:bg-[#4752C4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            {isLoading ? 'Creating account...' : 'Sign up with Discord'}
          </button>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          By signing up, you agree to our Terms of Service and Privacy Policy.
          <br />
          No credit card required for free tier.
        </p>
      </div>
    </div>
  )
}

function SignupFormFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full px-6">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-primary">FilingsFlow</div>
          <div className="mt-6 h-9 w-48 mx-auto bg-gray-200 rounded animate-pulse" />
          <div className="mt-2 h-5 w-64 mx-auto bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="h-32 bg-gray-100 rounded-md animate-pulse mb-6" />
          <div className="h-12 bg-gray-200 rounded-md animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFormFallback />}>
      <SignupForm />
    </Suspense>
  )
}
