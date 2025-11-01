import Link from "next/link";
import { getParameters, Parameter } from "@/lib/api";

export default async function ParametersPage() {
  const parameters = await getParameters();

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'economic_accessibility':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'feature_access':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'system_parameters':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const formatCategoryName = (category: string) => {
    return category.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-indigo-600 dark:text-indigo-400 hover:underline mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            ⚙️ Governance Parameters
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            All {parameters.length} voteable parameters that control Dream Protocol governance
          </p>
        </div>

        {/* Parameters Grid */}
        <div className="space-y-6">
          {parameters.map((param: Parameter) => (
            <div
              key={param.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              {/* Header Row */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {param.parameterName.split('_').map(word =>
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(param.parameterCategory)}`}>
                      {formatCategoryName(param.parameterCategory)}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    {param.description}
                  </p>
                </div>
              </div>

              {/* Value Display */}
              <div className="grid md:grid-cols-4 gap-4 mb-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Value</div>
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {param.currentValue}
                    {param.valueType === 'decimal' && 'x'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Type</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {param.valueType.charAt(0).toUpperCase() + param.valueType.slice(1)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Range</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {param.minValue} - {param.maxValue}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Times Voted</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {param.timesVotedOn}
                  </div>
                </div>
              </div>

              {/* Rationale */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Rationale</div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {param.rationale}
                </p>
              </div>

              {/* Voting Requirements */}
              <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  {param.requiresSuperMajority ? (
                    <>
                      <span className="text-orange-500">⚠️</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Requires Super-Majority
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-green-500">✓</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Simple Majority
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-500">📅</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Vote Duration: {param.minimumVoteDurationDays}-{param.maximumVoteDurationDays} days
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-purple-500">👥</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Quorum: {param.minimumVoteQuorum} votes
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Summary
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                {parameters.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Parameters
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                {parameters.filter(p => p.requiresSuperMajority).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Require Super-Majority
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                {parameters.filter(p => p.isVoteable).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Currently Voteable
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
