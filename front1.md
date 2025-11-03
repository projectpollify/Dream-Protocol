# Frontend Phase 1: MVP Features (Week 1-4)
## Dream Protocol - User Interface Foundation

**Start Date**: TBD
**Duration**: 4 weeks
**Priority**: CRITICAL - No user interaction possible without these
**Dependencies**: Backend APIs (Modules 01-06) ✅ Complete

---

## 🎯 Phase 1 Goal
Build the **absolute minimum** UI needed for users to:
- Create accounts and set up dual identities
- View and vote on polls (True Self mode only)
- View basic user profiles
- Navigate the platform

---

## 📋 Week-by-Week Breakdown

### **Week 1: Project Setup & Authentication**

#### Day 1-2: Frontend Architecture Setup
```
apps/flagship/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── setup-identity/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   └── dashboard/
│   │       └── page.tsx
├── components/
│   ├── ui/              # Reusable UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── form.tsx
│   │   └── modal.tsx
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── IdentitySetup.tsx
│   └── layout/
│       ├── Header.tsx
│       ├── Navigation.tsx
│       └── Footer.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts    # API client setup
│   │   ├── auth.ts      # Auth API calls
│   │   └── types.ts     # TypeScript types
│   └── hooks/
│       ├── useAuth.ts
│       └── useApi.ts
└── contexts/
    ├── AuthContext.tsx
    └── IdentityContext.tsx
```

**Tasks:**
- [ ] Install UI dependencies (shadcn/ui, react-hook-form, zod)
- [ ] Set up API client with axios/fetch wrapper
- [ ] Create base layout components
- [ ] Set up authentication context
- [ ] Configure environment variables

#### Day 3-4: Login & Registration Pages
**Component: LoginForm.tsx**
```tsx
interface LoginFormProps {
  onSuccess: () => void;
}

Features:
- Email/username input
- Password input with show/hide toggle
- "Remember me" checkbox
- Forgot password link
- Submit with loading state
- Error handling & display
- Redirect to dashboard on success
```

**Component: RegisterForm.tsx**
```tsx
interface RegisterFormProps {
  onSuccess: (userId: string) => void;
}

Features:
- Email validation
- Username availability check
- Password strength indicator
- Terms acceptance checkbox
- CAPTCHA integration (if needed)
- Success → Identity setup flow
```

#### Day 5-7: Identity Setup Wizard
**Component: IdentitySetup.tsx**
```tsx
interface IdentitySetupProps {
  userId: string;
  onComplete: () => void;
}

Step 1: Understand Dual Identity
- Explainer cards with illustrations
- True Self vs Shadow concept
- Privacy implications
- "I understand" confirmation

Step 2: Create True Self
- Display name input
- Avatar upload (optional)
- Bio text area
- "This is my public identity" checkbox

Step 3: Create Shadow
- Auto-generated anonymous name
- Anonymous avatar selection
- "This protects my privacy" info
- Completion confirmation

Step 4: Success
- Both identities created
- Wallet addresses displayed
- "Go to Dashboard" button
```

---

### **Week 2: Poll Viewing Interface**

#### Day 8-9: Poll List/Feed
**Route: /polls**
**Component: PollList.tsx**
```tsx
interface Poll {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'closed' | 'draft';
  endDate: Date;
  totalVotes: number;
  category: string;
  creatorDid: string;
}

Features:
- Grid/List view toggle
- Status filter (Active/Closed/All)
- Category filter
- Sort options (Newest/Popular/Ending Soon)
- Pagination or infinite scroll
- Loading skeletons
- Empty state
```

**Component: PollCard.tsx**
```tsx
Features:
- Title & description (truncated)
- Status badge (Active/Closed)
- Time remaining countdown
- Vote count
- Category tag
- Creator info (anonymous if Shadow)
- Click → Poll details
```

#### Day 10-11: Poll Detail Page
**Route: /polls/[pollId]**
**Component: PollDetail.tsx**
```tsx
Sections:
1. Header
   - Title
   - Full description
   - Creator info
   - Created date
   - End date with countdown

2. Current Results
   - Yes/No/Abstain percentages
   - Visual progress bars
   - Total vote count
   - Participation rate

3. Voting Section
   - Radio buttons (Yes/No/Abstain)
   - Reasoning text area (optional)
   - Submit vote button
   - "You voted: [choice]" confirmation

4. Information Panel
   - Poll type badge
   - Category
   - Quorum requirements
   - Approval threshold
   - Additional rules

5. Activity Feed (simplified)
   - Recent votes (anonymized)
   - Vote timestamps
```

#### Day 12-14: Basic Voting Flow
**Component: VoteModal.tsx**
```tsx
interface VoteModalProps {
  pollId: string;
  currentVote?: VoteOption;
  onVote: (vote: VoteData) => void;
}

Flow:
1. Select vote option
2. Add reasoning (optional)
3. Confirm vote
4. Show loading
5. Success confirmation
6. Update UI with new vote

Error states:
- Already voted (show current vote)
- Poll closed
- Not authenticated
- Network error
```

---

### **Week 3: User Profiles (View Only)**

#### Day 15-16: Profile Page Layout
**Route: /profile/[userId]**
**Component: UserProfile.tsx**
```tsx
interface UserProfile {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  joinDate: Date;
  lightScore: number;
  isVerified: boolean;
  stats: {
    totalVotes: number;
    pollsCreated: number;
    followers: number;
    following: number;
  };
}

Sections:
1. Header
   - Avatar
   - Display name
   - Username
   - Bio
   - Join date
   - Verification badge

2. Stats Grid
   - Light Score
   - Total Votes
   - Polls Created
   - Followers/Following

3. Activity Tabs
   - Recent Votes (public only)
   - Created Polls
   - (Other tabs disabled for Phase 1)
```

#### Day 17-18: Profile Components
**Component: ProfileHeader.tsx**
```tsx
Features:
- Large avatar with fallback
- Name & username display
- Bio with "Show more" for long text
- Edit button (disabled in Phase 1)
- Follow button (disabled in Phase 1)
```

**Component: ProfileStats.tsx**
```tsx
Features:
- Stat cards with icons
- Number formatting (1.2K, etc.)
- Hover tooltips with explanations
- Light Score visual indicator
```

**Component: ProfileActivity.tsx**
```tsx
Features:
- Tab navigation
- Activity list items
- Timestamp formatting
- Load more pagination
- Empty states per tab
```

#### Day 19-21: Current User Profile
**Route: /profile**
**Additional Features:**
- "This is you" indicator
- Edit profile button (disabled)
- Settings link (disabled)
- Identity mode indicator (True Self/Shadow)
- Switch identity button (disabled in Phase 1)

---

### **Week 4: Navigation & Polish**

#### Day 22-23: Navigation System
**Component: Header.tsx**
```tsx
Features:
- Logo/Brand
- Main navigation menu
  - Dashboard
  - Polls
  - Profile
  - (Other items disabled)
- User menu dropdown
  - View Profile
  - Settings (disabled)
  - Logout
- Identity indicator (True Self)
- Notification bell (disabled)
```

**Component: MobileNav.tsx**
```tsx
Features:
- Hamburger menu
- Slide-out drawer
- Same menu items as desktop
- Touch-friendly sizing
- Smooth animations
```

#### Day 24-25: Loading & Error States
**Component: LoadingSpinner.tsx**
**Component: ErrorBoundary.tsx**
**Component: EmptyState.tsx**
**Component: SkeletonLoader.tsx**

**Patterns:**
```tsx
// Consistent loading states
const PollList = () => {
  const { data, loading, error } = usePolls();

  if (loading) return <PollListSkeleton />;
  if (error) return <ErrorState error={error} retry={refetch} />;
  if (!data.length) return <EmptyState type="polls" />;

  return <PollGrid polls={data} />;
};
```

#### Day 26-27: Responsive Design
**Breakpoints:**
- Mobile: 0-640px
- Tablet: 641-1024px
- Desktop: 1025px+

**Testing Checklist:**
- [ ] All pages mobile responsive
- [ ] Touch targets minimum 44px
- [ ] Text readable without zoom
- [ ] Images properly sized
- [ ] Modals/drawers mobile-friendly
- [ ] Forms usable on mobile

#### Day 28: Final Integration & Testing
**Testing Checklist:**
- [ ] Authentication flow end-to-end
- [ ] Poll viewing and voting
- [ ] Profile viewing
- [ ] Navigation between pages
- [ ] Error handling
- [ ] Loading states
- [ ] Mobile responsiveness
- [ ] Browser compatibility

---

## 🛠 Technical Stack

### Core Dependencies
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "@radix-ui/react-*": "latest",
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "date-fns": "^2.30.0",
    "clsx": "^2.0.0",
    "react-hot-toast": "^2.4.0"
  }
}
```

### Component Library Setup
Using **shadcn/ui** for consistent, customizable components:
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input form
npx shadcn-ui@latest add dialog dropdown-menu
npx shadcn-ui@latest add toast avatar badge
```

### API Client Setup
```typescript
// lib/api/client.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### State Management
Using **React Context + useReducer** for global state:
```typescript
// contexts/AuthContext.tsx
interface AuthState {
  user: User | null;
  identityMode: 'true_self' | 'shadow';
  isAuthenticated: boolean;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
  switchIdentity: () => void;
}
```

---

## 📊 Success Metrics

### Week 1 Completion Criteria
- [ ] User can register account
- [ ] User can log in/out
- [ ] User can complete identity setup
- [ ] Auth state persists on refresh

### Week 2 Completion Criteria
- [ ] User can view list of polls
- [ ] User can view poll details
- [ ] User can cast vote (True Self only)
- [ ] Vote is recorded in backend

### Week 3 Completion Criteria
- [ ] User can view any profile
- [ ] User can view own profile
- [ ] Profile shows accurate data
- [ ] Profile stats update properly

### Week 4 Completion Criteria
- [ ] Navigation works on all devices
- [ ] All loading states implemented
- [ ] All error states handled
- [ ] Mobile responsive design complete

---

## 🚨 Risk Mitigation

### Potential Blockers & Solutions

**1. API Integration Issues**
- Risk: Backend API doesn't match frontend needs
- Solution: Create mock data layer first, adapt as needed

**2. Authentication Complexity**
- Risk: Dual identity system confusing
- Solution: Simplify Phase 1 to True Self only

**3. Mobile Responsiveness**
- Risk: Takes longer than expected
- Solution: Mobile-first development approach

**4. State Management**
- Risk: Prop drilling becomes unwieldy
- Solution: Implement Context API early

**5. Timeline Slippage**
- Risk: Features take longer than estimated
- Solution: Priority-based development, defer nice-to-haves

---

## 🎯 Definition of Done

### Phase 1 is complete when:

1. **New users can:**
   - ✅ Create account
   - ✅ Set up dual identity
   - ✅ Understand the platform

2. **Authenticated users can:**
   - ✅ View all polls
   - ✅ Vote on active polls
   - ✅ View poll results
   - ✅ View profiles
   - ✅ Navigate between pages

3. **Technical requirements:**
   - ✅ Mobile responsive
   - ✅ Error handling complete
   - ✅ Loading states implemented
   - ✅ API fully integrated
   - ✅ Authentication working

---

## 📝 Notes for Development

### Naming Conventions
```typescript
// Components: PascalCase
UserProfile.tsx, VoteModal.tsx

// Hooks: camelCase with 'use' prefix
useAuth.ts, usePolls.ts

// API functions: camelCase
fetchPolls(), castVote()

// Types/Interfaces: PascalCase
interface UserProfile {}
type VoteOption = 'yes' | 'no' | 'abstain';

// Constants: UPPER_SNAKE_CASE
const API_TIMEOUT = 5000;
```

### File Organization
```
- One component per file
- Related components in same folder
- Shared components in components/ui
- Page-specific components in app/[page]/components
- Business logic in lib/
- API calls in lib/api/
- Custom hooks in lib/hooks/
```

### Testing Strategy (if time permits)
```typescript
// Component testing with React Testing Library
- User interaction tests
- Accessibility tests
- Error state tests

// Integration testing
- Auth flow end-to-end
- Poll voting flow
- API integration tests

// Visual regression testing
- Screenshot comparison
- Responsive design tests
```

---

## 🚀 Next Steps (Phase 2 Preview)

After Phase 1 completion, Phase 2 will add:
- Poll creation interface
- Dual-mode voting (Shadow identity)
- Staking on poll outcomes
- Real-time notifications
- Advanced user interactions

**Continue to front2.md for Phase 2 details...**