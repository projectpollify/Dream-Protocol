'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { getIdentityIcon, formatIdentityDisplay } from '@/lib/utils/identity';
import { IdentityMode } from '@/lib/api/types';

interface ModeSwitcherProps {
  className?: string;
  showLabel?: boolean;
}

export function ModeSwitcher({ className, showLabel = true }: ModeSwitcherProps) {
  const { user, switchMode, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isAuthenticated() || !user) {
    return null;
  }

  const currentMode = user.mode;
  const targetMode: IdentityMode = currentMode === 'true_self' ? 'shadow' : 'true_self';

  const handleSwitch = async () => {
    setLoading(true);
    try {
      await switchMode(targetMode);
      setShowConfirm(false);
    } catch (error) {
      console.error('Failed to switch mode:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentIcon = getIdentityIcon(currentMode);
  const targetIcon = getIdentityIcon(targetMode);
  const currentDisplay = formatIdentityDisplay(user);

  return (
    <div className={className}>
      {!showConfirm ? (
        <div className="flex items-center space-x-3">
          {/* Current Mode Indicator */}
          <div
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              currentMode === 'true_self'
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-purple-50 border border-purple-200'
            }`}
          >
            <span className="text-xl">{currentIcon}</span>
            {showLabel && (
              <div className="flex flex-col">
                <span
                  className={`text-xs font-medium ${
                    currentMode === 'true_self' ? 'text-blue-700' : 'text-purple-700'
                  }`}
                >
                  {currentMode === 'true_self' ? 'True Self' : 'Shadow'}
                </span>
                <span
                  className={`text-xs ${
                    currentMode === 'true_self' ? 'text-blue-600' : 'text-purple-600'
                  }`}
                >
                  {currentDisplay}
                </span>
              </div>
            )}
          </div>

          {/* Switch Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfirm(true)}
            className="flex items-center space-x-2"
          >
            <span>Switch to {targetIcon}</span>
            {showLabel && <span>{targetMode === 'true_self' ? 'True Self' : 'Shadow'}</span>}
          </Button>
        </div>
      ) : (
        <div className="p-4 rounded-lg border-2 border-yellow-200 bg-yellow-50">
          <div className="flex items-start space-x-3 mb-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <h4 className="font-semibold text-yellow-900 mb-1">
                Switch to {targetMode === 'true_self' ? 'True Self' : 'Shadow'} mode?
              </h4>
              <p className="text-sm text-yellow-800">
                {targetMode === 'true_self' ? (
                  <>
                    You will switch to your public identity. Your actions will be associated
                    with your True Self profile.
                  </>
                ) : (
                  <>
                    You will switch to anonymous mode. Your actions will not be linked to
                    your True Self identity.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={handleSwitch}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Switching...' : `Yes, switch to ${targetIcon}`}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for header/navigation
export function CompactModeSwitcher() {
  const { user, switchMode, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated() || !user) {
    return null;
  }

  const currentMode = user.mode;
  const targetMode: IdentityMode = currentMode === 'true_self' ? 'shadow' : 'true_self';
  const currentIcon = getIdentityIcon(currentMode);

  const handleQuickSwitch = async () => {
    setLoading(true);
    try {
      await switchMode(targetMode);
    } catch (error) {
      console.error('Failed to switch mode:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleQuickSwitch}
      disabled={loading}
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
        currentMode === 'true_self'
          ? 'bg-blue-100 hover:bg-blue-200 text-blue-700'
          : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={`Switch to ${targetMode === 'true_self' ? 'True Self' : 'Shadow'}`}
    >
      <span className="text-lg">{currentIcon}</span>
      <span className="text-sm font-medium">
        {currentMode === 'true_self' ? 'True Self' : 'Shadow'}
      </span>
    </button>
  );
}