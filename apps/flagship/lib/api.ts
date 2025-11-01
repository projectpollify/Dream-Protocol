// API Client for Dream Protocol Governance Module

const API_BASE_URL = 'http://localhost:3005/api/v1/governance';

export interface Parameter {
  id: string;
  parameterName: string;
  parameterCategory: string;
  valueType: string;
  minValue: string;
  maxValue: string;
  defaultValue: string;
  currentValue: string;
  description: string;
  rationale: string;
  requiresSuperMajority: boolean;
  minimumVoteDurationDays: number;
  maximumVoteDurationDays: number;
  requiresVerificationToVote: boolean;
  minimumVoteQuorum: number;
  quorumPercentageOfVerified: number;
  quorumEnforcement: string;
  isVoteable: boolean;
  isEmergencyParameter: boolean;
  lastVotedOn: string | null;
  timesVotedOn: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConstitutionalArticle {
  id: string;
  articleNumber: number;
  articleTitle: string;
  protectedRule: string;
  rationale: string;
  examplesOfViolations: string;
  amendmentRequiresFounderApproval: boolean;
  amendmentRequires90PercentApproval: boolean;
  amendmentMinimumDiscussionDays: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationResult {
  success: boolean;
  violatesConstitution: boolean;
  violations?: Array<{
    articleNumber: number;
    articleTitle: string;
    reason: string;
  }>;
  message: string;
}

// Fetch all parameters
export async function getParameters(): Promise<Parameter[]> {
  const response = await fetch(`${API_BASE_URL}/parameters`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch parameters');
  }

  const data = await response.json();
  return data.parameters;
}

// Fetch all constitutional articles
export async function getConstitution(): Promise<ConstitutionalArticle[]> {
  const response = await fetch(`${API_BASE_URL}/constitution`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch constitution');
  }

  const data = await response.json();
  return data.articles;
}

// Validate a poll against the constitution
export async function validatePoll(
  pollType: string,
  parameterName?: string,
  proposedValue?: string
): Promise<ValidationResult> {
  const response = await fetch(`${API_BASE_URL}/constitution/validate-poll`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pollType,
      parameterName,
      proposedValue,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to validate poll');
  }

  return response.json();
}

// Health check
export async function healthCheck() {
  const response = await fetch('http://localhost:3005/health', {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Health check failed');
  }

  return response.json();
}
