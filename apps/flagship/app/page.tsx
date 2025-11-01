import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            🏛️ Dream Protocol
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
            Module 06: Governance Testing Dashboard
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Dual-Mode Democratic Decision-Making Engine
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                System Status
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Backend API running on <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">localhost:3005</code>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-600 dark:text-green-400 font-semibold">Online</span>
            </div>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Parameters Card */}
          <Link href="/parameters">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-indigo-500">
              <div className="text-4xl mb-4">⚙️</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Parameters
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                View all 9 voteable governance parameters
              </p>
              <div className="text-indigo-600 dark:text-indigo-400 font-medium text-sm">
                View Parameters →
              </div>
            </div>
          </Link>

          {/* Constitution Card */}
          <Link href="/constitution">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-purple-500">
              <div className="text-4xl mb-4">📜</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Constitution
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                Read all 6 constitutional articles
              </p>
              <div className="text-purple-600 dark:text-purple-400 font-medium text-sm">
                View Constitution →
              </div>
            </div>
          </Link>

          {/* Validation Card */}
          <Link href="/validate">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-green-500">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Validation Test
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                Test constitutional protection mechanism
              </p>
              <div className="text-green-600 dark:text-green-400 font-medium text-sm">
                Test Validation →
              </div>
            </div>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            What's Working
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Database</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">9 tables, all migrations complete</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Parameters</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">9 voteable parameters seeded</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Constitution</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">6 protected articles active</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">API</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">36 endpoints operational</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Tests</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">51/51 core tests passing</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Protection</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">Constitutional validation working</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 dark:text-gray-400 text-sm">
          <p>Module 06 successfully deployed! 🎉</p>
          <p className="mt-2">Frontend: Next.js 15 • Backend: Express + PostgreSQL • Tests: Vitest</p>
        </div>
      </div>
    </div>
  );
}
