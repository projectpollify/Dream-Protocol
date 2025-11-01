'use client';

import Link from "next/link";
import { useState } from "react";
import { validatePoll, ValidationResult } from "@/lib/api";

export default function ValidationPage() {
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const testCases = [
    {
      id: 'disable_shadow',
      name: 'Try to Disable Shadow Voting',
      description: 'This should FAIL - violates Article 1 (Dual-Identity Architecture)',
      pollType: 'parameter_vote',
      parameterName: 'enable_shadow_voting',
      proposedValue: 'false',
      expectedResult: 'BLOCKED',
    },
    {
      id: 'disable_poh',
      name: 'Try to Disable Proof of Humanity',
      description: 'This should FAIL - violates Article 3 (Proof of Humanity Requirement)',
      pollType: 'parameter_vote',
      parameterName: 'disable_poh_verification',
      proposedValue: 'true',
      expectedResult: 'BLOCKED',
    },
    {
      id: 'enable_shorts',
      name: 'Try to Enable Short Selling',
      description: 'This should FAIL - violates Article 5 (Spot-Only Token Strategy)',
      pollType: 'parameter_vote',
      parameterName: 'enable_token_shorts',
      proposedValue: 'true',
      expectedResult: 'BLOCKED',
    },
    {
      id: 'valid_change',
      name: 'Change Poll Creation Cost',
      description: 'This should PASS - valid parameter change',
      pollType: 'parameter_vote',
      parameterName: 'poll_creation_cost_general',
      proposedValue: '1000',
      expectedResult: 'ALLOWED',
    },
  ];

  const handleTest = async (test: typeof testCases[0]) => {
    setSelectedTest(test.id);
    setLoading(true);
    setResult(null);

    try {
      const validationResult = await validatePoll(
        test.pollType,
        test.parameterName,
        test.proposedValue
      );
      setResult(validationResult);
    } catch (error) {
      console.error('Validation error:', error);
      setResult({
        success: false,
        violatesConstitution: false,
        message: 'Error: Could not connect to API',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-green-600 dark:text-green-400 hover:underline mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            ✅ Constitutional Validation Test
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Test the constitutional protection mechanism with various scenarios
          </p>
        </div>

        {/* How It Works */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-8">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            How Constitutional Protection Works
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Before any governance poll can be created, it must be validated against the 6 constitutional articles.
            Any attempt to violate protected rules is automatically blocked. Try the test cases below to see it in action!
          </p>
        </div>

        {/* Test Cases */}
        <div className="space-y-4 mb-8">
          {testCases.map((test) => (
            <div
              key={test.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 cursor-pointer transition-all ${
                selectedTest === test.id ? 'ring-2 ring-indigo-500' : ''
              } hover:shadow-xl`}
              onClick={() => handleTest(test)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {test.name}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        test.expectedResult === 'BLOCKED'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}
                    >
                      Expected: {test.expectedResult}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    {test.description}
                  </p>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 text-xs font-mono">
                    <div><span className="text-gray-500">Poll Type:</span> {test.pollType}</div>
                    <div><span className="text-gray-500">Parameter:</span> {test.parameterName}</div>
                    <div><span className="text-gray-500">Proposed Value:</span> {test.proposedValue}</div>
                  </div>
                </div>
                <button
                  className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  disabled={loading && selectedTest === test.id}
                >
                  {loading && selectedTest === test.id ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Validation Result
            </h2>

            {/* Success/Failure Banner */}
            <div
              className={`border-l-4 p-4 mb-6 ${
                result.violatesConstitution
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                  : 'bg-green-50 dark:bg-green-900/20 border-green-500'
              }`}
            >
              <div className="flex items-start">
                <div className="text-2xl mr-3">
                  {result.violatesConstitution ? '🚫' : '✅'}
                </div>
                <div>
                  <h3
                    className={`text-sm font-medium mb-2 ${
                      result.violatesConstitution
                        ? 'text-red-800 dark:text-red-200'
                        : 'text-green-800 dark:text-green-200'
                    }`}
                  >
                    {result.violatesConstitution ? 'Constitutional Violation Detected' : 'Validation Passed'}
                  </h3>
                  <p
                    className={`text-sm ${
                      result.violatesConstitution
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-green-700 dark:text-green-300'
                    }`}
                  >
                    {result.message}
                  </p>
                </div>
              </div>
            </div>

            {/* Violations */}
            {result.violations && result.violations.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Violated Articles:
                </h3>
                <div className="space-y-3">
                  {result.violations.map((violation, idx) => (
                    <div
                      key={idx}
                      className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-3xl font-bold text-red-400">
                          {violation.articleNumber}
                        </div>
                        <div>
                          <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                            Article {violation.articleNumber}: {violation.articleTitle}
                          </h4>
                          <p className="text-sm text-red-800 dark:text-red-200">
                            {violation.reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw JSON */}
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                View Raw JSON Response
              </summary>
              <pre className="mt-3 p-4 bg-gray-50 dark:bg-gray-900 rounded text-xs overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
