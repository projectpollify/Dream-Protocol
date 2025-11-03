'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ModeSwitcher } from '@/components/auth/ModeSwitcher';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, needsIdentitySetup, logout } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated()) {
      router.push('/login');
    }

    // Identity setup is completed during registration, no separate step needed
    // if (!loading && needsIdentitySetup()) {
    //   router.push('/setup-identity');
    // }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dream Protocol</h1>
              <p className="text-sm text-gray-600">Dashboard</p>
            </div>

            <div className="flex items-center space-x-4">
              <ModeSwitcher />
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Welcome Card */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle>Welcome to Dream Protocol!</CardTitle>
              <CardDescription>
                Your dual-identity governance platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-700">
                  You're currently in <strong>{user.mode === 'true_self' ? 'True Self' : 'Shadow'}</strong> mode.
                  Use the mode switcher above to switch between your identities.
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-2">👤 True Self</h3>
                    <p className="text-sm text-blue-800">
                      Your public identity for building reputation and taking credit for your ideas.
                    </p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h3 className="font-semibold text-purple-900 mb-2">🎭 Shadow</h3>
                    <p className="text-sm text-purple-800">
                      Your anonymous identity for speaking freely without social pressure.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Display Name</p>
                  <p className="font-medium">{user.profile?.displayName || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Light Score</p>
                  <p className="font-medium">{user.lightScore || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Verification Status</p>
                  <p className="font-medium capitalize">{user.verificationStatus || 'Unverified'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  View Polls
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Create Poll
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  View Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">No recent activity</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}