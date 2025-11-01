import Link from "next/link";
import { getConstitution, ConstitutionalArticle } from "@/lib/api";

export default async function ConstitutionPage() {
  const articles = await getConstitution();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-purple-600 dark:text-purple-400 hover:underline mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            📜 Dream Protocol Constitution
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {articles.length} protected rules that cannot be changed via simple governance votes
          </p>
        </div>

        {/* Warning Banner */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 mb-8">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Constitutional Protection Active
              </h3>
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                These articles protect Dream Protocol's core principles. Amendments require 90% approval + founder consent + 90-day discussion period.
              </p>
            </div>
          </div>
        </div>

        {/* Articles */}
        <div className="space-y-6">
          {articles.map((article: ConstitutionalArticle) => (
            <div
              key={article.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
            >
              {/* Article Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
                <div className="flex items-center gap-4">
                  <div className="text-5xl font-bold opacity-50">
                    {article.articleNumber}
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide opacity-75 mb-1">
                      Article {article.articleNumber}
                    </div>
                    <h2 className="text-2xl font-bold">
                      {article.articleTitle}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Article Content */}
              <div className="p-6">
                {/* Protected Rule */}
                <div className="mb-6">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Protected Rule
                  </div>
                  <p className="text-lg font-medium text-gray-900 dark:text-white leading-relaxed">
                    {article.protectedRule}
                  </p>
                </div>

                {/* Rationale */}
                <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2 uppercase tracking-wide">
                    Why This Matters
                  </div>
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    {article.rationale}
                  </p>
                </div>

                {/* Examples of Violations */}
                <div className="mb-6">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Examples of Violations
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                    <ul className="space-y-2">
                      {article.examplesOfViolations.split('\n').filter(line => line.trim()).map((violation, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-red-900 dark:text-red-100">
                          <span className="text-red-500 mt-0.5">×</span>
                          <span>{violation.replace(/^-\s*/, '')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Amendment Requirements */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                    Amendment Requirements
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-xl">🔒</span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">90% Approval</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Required</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-xl">👑</span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Founder Consent</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Required</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-xl">⏳</span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">90-Day Discussion</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Minimum</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            These {articles.length} articles form the immutable foundation of Dream Protocol's governance system
          </p>
        </div>
      </div>
    </div>
  );
}
