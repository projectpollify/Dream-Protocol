'use client';

import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Dream Protocol
          </h1>
          <p className="text-gray-600">
            Where truth meets governance
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}