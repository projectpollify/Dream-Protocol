'use client';

import { RegisterForm } from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Join Dream Protocol
          </h1>
          <p className="text-gray-600">
            Create your dual-identity account
          </p>
        </div>

        <RegisterForm />
      </div>
    </div>
  );
}