import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationSettings } from '@/components/settings/notification-settings'
import { SubscriptionCard } from '@/components/settings/subscription-card'
import { SignOutButton } from '@/components/settings/sign-out-button'
import type { Tables } from '@/types/database'

type User = Tables<'users'>
type NotificationPrefs = Tables<'notification_preferences'>

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: notificationPrefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const userProfile = profile as User | null
  const prefs = notificationPrefs as NotificationPrefs | null

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="space-y-6">
        <section className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Account</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Email</label>
              <p className="mt-1 text-gray-900">{user.email}</p>
            </div>
            {userProfile?.discord_username && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Discord</label>
                <p className="mt-1 text-gray-900">{userProfile.discord_username}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-500">Member Since</label>
              <p className="mt-1 text-gray-900">
                {userProfile?.created_at
                  ? new Date(userProfile.created_at).toLocaleDateString()
                  : '-'}
              </p>
            </div>
          </div>
        </section>

        <SubscriptionCard
          tier={userProfile?.subscription_tier || 'free'}
          status={userProfile?.subscription_status}
          trialEndsAt={userProfile?.trial_ends_at}
        />

        <NotificationSettings prefs={prefs} />

        <section className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Danger Zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sign out of your account</p>
            </div>
            <SignOutButton />
          </div>
        </section>
      </div>
    </div>
  )
}
