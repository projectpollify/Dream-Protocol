# Frontend Phase 2: Core Features (Week 5-8)
## Dream Protocol - Advanced Governance & Economy

**Start Date**: After Phase 1 completion
**Duration**: 4 weeks
**Priority**: HIGH - Core differentiating features
**Prerequisites**: Phase 1 complete (Auth, Basic Polls, Profiles)

---

## 🎯 Phase 2 Goal
Enable the **full Dream Protocol experience**:
- Create and manage polls with PollCoin
- Dual-mode voting (True Self + Shadow)
- Stake Gratium on outcomes
- Real-time notifications
- Shadow Consensus visualization

---

## 📋 Week-by-Week Breakdown

### **Week 5: Poll Creation & Management**

#### Day 29-30: Poll Creation Form
**Route: /polls/create**
**Component: CreatePollForm.tsx**

```tsx
interface CreatePollData {
  title: string;
  description: string;
  pollType: 'standard' | 'constitutional' | 'parameter';
  category: string;
  options: PollOption[];
  duration: number; // days
  quorumRequirement: number; // percentage
  approvalThreshold: number; // percentage
  requiredPollCoin: number;
}
```

**Multi-Step Form:**

**Step 1: Basic Information**
```tsx
<FormSection title="Poll Details">
  <Input
    label="Title"
    maxLength={100}
    helper="Clear, concise question"
  />
  <Textarea
    label="Description"
    maxLength={1000}
    helper="Provide context and implications"
  />
  <Select
    label="Category"
    options={categories}
  />
  <RadioGroup
    label="Poll Type"
    options={['Standard', 'Constitutional', 'Parameter']}
  />
</FormSection>
```

**Step 2: Voting Options**
```tsx
<FormSection title="Options">
  <OptionsBuilder>
    - Default: Yes/No/Abstain
    - Custom: Add up to 5 options
    - Reorder with drag & drop
    - Delete option
    - Option descriptions
  </OptionsBuilder>
</FormSection>
```

**Step 3: Voting Rules**
```tsx
<FormSection title="Rules & Requirements">
  <DurationPicker
    min={1}
    max={30}
    default={7}
  />
  <PercentageSlider
    label="Quorum Required"
    min={10}
    max={100}
    default={30}
  />
  <PercentageSlider
    label="Approval Threshold"
    min={50}
    max={100}
    default={66}
  />
  <Checkbox
    label="Allow vote changes"
    default={true}
  />
  <NumberInput
    label="Max vote changes"
    min={1}
    max={5}
    default={3}
  />
</FormSection>
```

**Step 4: Review & Pay**
```tsx
<FormSection title="Review & Submit">
  <PollPreview data={formData} />
  <CostBreakdown>
    - Base cost: 10 PollCoin
    - Duration multiplier: x{durationMultiplier}
    - Type multiplier: x{typeMultiplier}
    - Total: {totalCost} PollCoin
  </CostBreakdown>
  <WalletBalance
    token="PollCoin"
    balance={userBalance}
    required={totalCost}
  />
  <Button
    disabled={insufficientFunds}
    onClick={submitPoll}
  >
    Create Poll ({totalCost} PollCoin)
  </Button>
</FormSection>
```

#### Day 31-32: Poll Management Dashboard
**Route: /my-polls**
**Component: MyPolls.tsx**

```tsx
interface MyPollsView {
  tabs: ['Active', 'Draft', 'Closed', 'All'];
  filters: {
    status: PollStatus;
    dateRange: DateRange;
    search: string;
  };
}
```

**Features per Poll:**
- Edit (if draft)
- Cancel (if active, with restrictions)
- View results
- Export results (CSV/JSON)
- Share link
- Boost visibility (spend PollCoin)

**Poll Analytics:**
```tsx
<PollAnalytics pollId={pollId}>
  - Participation rate graph
  - Vote distribution pie chart
  - Voting timeline
  - Identity mode breakdown
  - Geographic distribution (if available)
  - Delegation impact
</PollAnalytics>
```

#### Day 33-35: Advanced Poll Features
**Component: PollSettings.tsx**
```tsx
Features:
- Whitelist/Blacklist voters
- Set delegation rules
- Add evidence/documents
- Link related polls
- Set execution triggers
- Schedule start time
```

**Component: PollTemplates.tsx**
```tsx
Templates:
- Simple Yes/No
- Multiple Choice
- Ranked Choice
- Budget Allocation
- Constitutional Amendment
- Parameter Change

Save custom templates for reuse
```

---

### **Week 6: Dual-Mode Voting System**

#### Day 36-37: Identity Switcher
**Component: IdentityModeToggle.tsx**
```tsx
interface IdentityMode {
  current: 'true_self' | 'shadow';
  trueSelf: {
    name: string;
    avatar: string;
    did: string;
  };
  shadow: {
    name: string;
    avatar: string;
    did: string;
  };
}

Features:
- Visual toggle switch
- Current identity indicator
- Confirmation modal on switch
- Animated transition
- Persistent selection
- Keyboard shortcut (Cmd+I)
```

**Visual Design:**
```
[True Self 🌞] <--toggle--> [🌙 Shadow]
      |                          |
   John Doe                Anonymous_7823
   @johndoe                    @shadow_7823
```

#### Day 38-39: Dual Voting Interface
**Component: DualVotePanel.tsx**
```tsx
interface DualVoteState {
  trueSelfVote?: VoteOption;
  shadowVote?: VoteOption;
  currentMode: 'true_self' | 'shadow';
}

Layout:
┌─────────────────────────────────┐
│ Voting as: [Identity Toggle]     │
├─────────────────────────────────┤
│ True Self Vote:  [✓ Yes]        │
│ Shadow Vote:     [✓ No]         │
│                                  │
│ [Submit Vote in Current Mode]    │
└─────────────────────────────────┘
```

**Features:**
- Show both votes side-by-side
- Visual distinction between modes
- Prevent accidental mode confusion
- Show which vote is being cast
- Confirmation before submission

#### Day 40-42: Shadow Consensus Display
**Component: ShadowConsensus.tsx**
```tsx
interface ConsensusData {
  trueSelfResults: VoteResults;
  shadowResults: VoteResults;
  consensusGap: number;
  convergenceTrend: 'converging' | 'diverging' | 'stable';
  confidenceInterval: number;
}
```

**Visualization Options:**

**1. Dual Bar Chart**
```
True Self:  ████████░░ 80% Yes
Shadow:     ███░░░░░░░ 30% Yes
Gap:        ↕ 50 points
```

**2. Overlapping Circles**
```
    True Self        Shadow
   ╱         ╲      ╱         ╲
  │    YES    │ ∩ │    NO     │
   ╲         ╱      ╲         ╱
    Consensus: 40% overlap
```

**3. Timeline Graph**
```
100% ┤ True Self ──────
     │         ╱╲
 50% ┤        ╱  ╲ Shadow
     │       ╱    ╲────
  0% └────────────────→ Time
```

**Interactive Features:**
- Hover for detailed breakdowns
- Click to expand analysis
- Toggle between visualizations
- Export as image
- Share consensus snapshot

---

### **Week 7: Staking System**

#### Day 43-44: Staking Interface
**Route: /polls/[pollId]/stake**
**Component: StakeOnPoll.tsx**

```tsx
interface StakeData {
  pollId: string;
  position: VoteOption;
  amount: number;
  potentialReturn: number;
  currentOdds: number;
  lockPeriod: string;
}
```

**Staking Form:**
```tsx
<StakeForm>
  <PositionSelector>
    - Select outcome to stake on
    - Show current odds
    - Display total pool per option
  </PositionSelector>

  <AmountInput>
    - Gratium amount input
    - Quick amounts (25%, 50%, 100%)
    - USD equivalent display
    - Balance: {gratiumBalance}
  </AmountInput>

  <ReturnCalculator>
    - Potential win: +{potentialWin} Gratium
    - Potential loss: -{stakeAmount} Gratium
    - ROI: {roiPercentage}%
    - Probability estimate
  </ReturnCalculator>

  <RiskWarning>
    ⚠️ Stakes are locked until poll closes
    ⚠️ You lose your stake if wrong
    ✅ Earn rewards if correct
  </RiskWarning>

  <Button onClick={confirmStake}>
    Stake {amount} Gratium on {position}
  </Button>
</StakeForm>
```

#### Day 45-46: Staking Dashboard
**Route: /staking**
**Component: StakingDashboard.tsx**

```tsx
Sections:
1. Portfolio Overview
   - Total staked: {totalStaked} Gratium
   - Active stakes: {activeCount}
   - Total won: +{totalWon}
   - Total lost: -{totalLost}
   - Win rate: {winRate}%

2. Active Stakes
   - Poll title
   - Your position
   - Amount staked
   - Current odds
   - Time remaining
   - Cancel option (if allowed)

3. Stake History
   - Completed stakes
   - Won/Lost indicator
   - Profit/Loss amount
   - Date completed
   - Poll outcome

4. Performance Analytics
   - Win/Loss chart over time
   - Best performing categories
   - ROI by poll type
   - Streak indicators
```

#### Day 47-49: Staking Rewards & Claims
**Component: ClaimRewards.tsx**
```tsx
Features:
- Pending rewards list
- One-click claim all
- Individual claim buttons
- Auto-claim option
- Reward history
- Tax report export
```

**Component: StakingLeaderboard.tsx**
```tsx
Rankings:
- Top stakers by volume
- Best win rate
- Highest total earnings
- Longest win streak
- Category specialists

Filters:
- Time period (day/week/month/all)
- Poll category
- Minimum stakes
```

---

### **Week 8: Notifications & Real-time Updates**

#### Day 50-51: Notification System
**Component: NotificationCenter.tsx**
```tsx
interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  read: boolean;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high';
}

enum NotificationType {
  POLL_CREATED = 'poll_created',
  POLL_ENDING_SOON = 'poll_ending_soon',
  POLL_CLOSED = 'poll_closed',
  STAKE_WON = 'stake_won',
  STAKE_LOST = 'stake_lost',
  VOTE_DELEGATED = 'vote_delegated',
  FOLLOW_ACTIVITY = 'follow_activity',
  MENTION = 'mention',
  SYSTEM = 'system'
}
```

**UI Components:**

**1. Notification Bell**
```tsx
<NotificationBell>
  - Badge with unread count
  - Dropdown panel
  - Mark all as read
  - Settings link
</NotificationBell>
```

**2. Notification Panel**
```tsx
<NotificationPanel>
  - Grouped by date
  - Type icons
  - Swipe to dismiss (mobile)
  - Click to action
  - Load more pagination
</NotificationPanel>
```

**3. Notification Toast**
```tsx
<NotificationToast>
  - Slide in from top-right
  - Auto-dismiss after 5s
  - Click to expand
  - Action buttons
</NotificationToast>
```

#### Day 52-53: Real-time Updates
**Setup WebSocket Connection:**
```typescript
// lib/websocket.ts
import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;

  connect(userId: string) {
    this.socket = io(WS_URL, {
      auth: { userId },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', this.onConnect);
    this.socket.on('disconnect', this.onDisconnect);
    this.socket.on('notification', this.onNotification);
    this.socket.on('poll_update', this.onPollUpdate);
    this.socket.on('vote_update', this.onVoteUpdate);
  }

  subscribeToPolls(pollIds: string[]) {
    this.socket?.emit('subscribe_polls', pollIds);
  }
}
```

**Real-time Features:**
```tsx
// Live poll updates
<LivePollResults pollId={pollId}>
  - Vote counts update instantly
  - Participation rate changes
  - New votes animation
  - Consensus gap updates
</LivePollResults>

// Live notifications
<LiveNotifications>
  - Instant push notifications
  - Sound alerts (optional)
  - Desktop notifications
  - Badge updates
</LiveNotifications>

// Activity indicators
<ActivityIndicator>
  - "3 people voting now"
  - "Poll closing in 5 minutes"
  - "New stake placed"
</ActivityIndicator>
```

#### Day 54-56: Notification Preferences
**Route: /settings/notifications**
**Component: NotificationSettings.tsx**

```tsx
<NotificationPreferences>
  Categories:
  ├── Polls
  │   ├── New polls in followed categories
  │   ├── Polls ending soon (I voted)
  │   ├── Poll results available
  │   └── My poll activity
  ├── Staking
  │   ├── Stake outcomes
  │   ├── Reward available
  │   └── Price alerts
  ├── Social
  │   ├── New followers
  │   ├── Mentions
  │   └── Followed user activity
  └── System
      ├── Security alerts
      ├── Platform updates
      └── Maintenance notices

  Delivery Methods:
  - In-app notifications [Always on]
  - Email notifications [Toggle]
  - Push notifications [Toggle]
  - SMS notifications [Toggle]

  Quiet Hours:
  - Enable quiet hours [Toggle]
  - Start time: [Time picker]
  - End time: [Time picker]
  - Override for urgent [Toggle]
</NotificationPreferences>
```

---

## 🛠 Technical Implementation

### State Management Upgrade
**Add Zustand for complex state:**
```typescript
// stores/pollStore.ts
import { create } from 'zustand';

interface PollStore {
  polls: Poll[];
  loading: boolean;
  filters: PollFilters;

  // Actions
  fetchPolls: () => Promise<void>;
  createPoll: (data: CreatePollData) => Promise<void>;
  voteTrueSelf: (pollId: string, vote: VoteOption) => Promise<void>;
  voteShadow: (pollId: string, vote: VoteOption) => Promise<void>;
  setFilters: (filters: PollFilters) => void;
}

export const usePollStore = create<PollStore>((set, get) => ({
  polls: [],
  loading: false,
  filters: {},

  fetchPolls: async () => {
    set({ loading: true });
    const polls = await api.getPolls(get().filters);
    set({ polls, loading: false });
  },
  // ... other actions
}));
```

### API Integration Expansion
```typescript
// lib/api/polls.ts
export const pollsApi = {
  create: async (data: CreatePollData): Promise<Poll> => {
    const response = await apiClient.post('/api/v1/governance/create-poll', data);
    return response.data;
  },

  vote: async (pollId: string, vote: VoteData): Promise<Vote> => {
    const response = await apiClient.post(`/api/v1/governance/polls/${pollId}/vote`, vote);
    return response.data;
  },

  stake: async (pollId: string, stake: StakeData): Promise<Stake> => {
    const response = await apiClient.post(`/api/v1/governance/polls/${pollId}/stake`, stake);
    return response.data;
  },

  getConsensus: async (pollId: string): Promise<ConsensusData> => {
    const response = await apiClient.get(`/api/v1/governance/polls/${pollId}/consensus`);
    return response.data;
  }
};
```

### WebSocket Integration
```typescript
// contexts/WebSocketContext.tsx
import { createContext, useContext, useEffect } from 'react';
import { WebSocketService } from '@/lib/websocket';

const WebSocketContext = createContext<WebSocketService | null>(null);

export const WebSocketProvider = ({ children }) => {
  const [ws] = useState(() => new WebSocketService());
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      ws.connect(user.id);
      return () => ws.disconnect();
    }
  }, [user]);

  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error('useWebSocket must be used within WebSocketProvider');
  return context;
};
```

### Component Library Additions
```bash
# Additional shadcn/ui components
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add slider
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add chart
npx shadcn-ui@latest add command
npx shadcn-ui@latest add calendar

# Additional dependencies
npm install zustand
npm install socket.io-client
npm install recharts
npm install react-beautiful-dnd
npm install react-countdown
npm install react-number-format
```

---

## 📊 Success Metrics

### Week 5 Completion
- [ ] Users can create polls
- [ ] Poll creation costs PollCoin
- [ ] Users can manage their polls
- [ ] Poll templates working

### Week 6 Completion
- [ ] Identity switching works
- [ ] Dual voting functional
- [ ] Shadow Consensus displayed
- [ ] Visualizations working

### Week 7 Completion
- [ ] Users can stake Gratium
- [ ] Staking dashboard complete
- [ ] Rewards claimable
- [ ] Leaderboard functional

### Week 8 Completion
- [ ] Real-time notifications working
- [ ] WebSocket connection stable
- [ ] Notification preferences saved
- [ ] Live updates functional

---

## 🎨 UI/UX Guidelines

### Visual Hierarchy
```
1. Primary Actions: Create Poll, Vote, Stake
2. Secondary Actions: View Results, Share, Follow
3. Tertiary Actions: Settings, Export, Report
```

### Color Coding
```scss
// Identity Modes
$true-self-color: #FDB813;  // Gold
$shadow-color: #4A5568;      // Dark gray

// Poll Status
$active-color: #10B981;      // Green
$closed-color: #6B7280;      // Gray
$ending-soon-color: #F59E0B; // Orange

// Voting Options
$yes-color: #10B981;         // Green
$no-color: #EF4444;          // Red
$abstain-color: #6B7280;     // Gray

// Staking
$profit-color: #10B981;      // Green
$loss-color: #EF4444;        // Red
$pending-color: #F59E0B;     // Orange
```

### Loading States
```tsx
// Skeleton for polls
<PollSkeleton>
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
    <div className="h-3 bg-gray-200 rounded w-full mb-4" />
    <div className="h-8 bg-gray-200 rounded w-1/3" />
  </div>
</PollSkeleton>

// Progressive loading
1. Show skeleton
2. Load critical data
3. Load supplementary data
4. Load images/media
```

### Error Handling
```tsx
// User-friendly error messages
const errorMessages = {
  INSUFFICIENT_FUNDS: "You need more PollCoin to create this poll",
  POLL_CLOSED: "This poll has ended and is no longer accepting votes",
  ALREADY_VOTED: "You've already voted on this poll",
  NETWORK_ERROR: "Connection issue. Please check your internet",
  VALIDATION_ERROR: "Please check the form and try again"
};

// Error recovery actions
<ErrorBoundary
  fallback={(error, retry) => (
    <ErrorCard>
      <p>{errorMessages[error.code] || "Something went wrong"}</p>
      <Button onClick={retry}>Try Again</Button>
    </ErrorCard>
  )}
/>
```

---

## 🚨 Risk Mitigation

### Phase 2 Specific Risks

**1. PollCoin Integration**
- Risk: Users can't acquire PollCoin
- Solution: Faucet for testnet, clear purchase flow

**2. Dual Identity Confusion**
- Risk: Users vote with wrong identity
- Solution: Clear visual indicators, confirmation modals

**3. WebSocket Stability**
- Risk: Connection drops frequently
- Solution: Automatic reconnection, fallback to polling

**4. Staking Complexity**
- Risk: Users don't understand staking
- Solution: Tutorial, simulator, clear warnings

**5. Performance with Real-time**
- Risk: UI becomes sluggish
- Solution: Debouncing, virtual scrolling, pagination

---

## 📝 Testing Checklist

### Functional Testing
- [ ] Create poll with all options
- [ ] Vote as True Self
- [ ] Switch identity and vote as Shadow
- [ ] Stake on poll outcome
- [ ] Receive notifications
- [ ] Claim staking rewards
- [ ] View Shadow Consensus

### Integration Testing
- [ ] WebSocket connection handling
- [ ] API error handling
- [ ] Token balance updates
- [ ] Multi-tab synchronization
- [ ] Offline mode handling

### Performance Testing
- [ ] Load 100+ polls
- [ ] Handle 50+ notifications
- [ ] Smooth animations
- [ ] Quick identity switching
- [ ] Fast form submissions

---

## 🚀 Phase 3 Preview

After Phase 2, users have full governance capabilities. Phase 3 will add:
- Complete user profiles with editing
- Activity feeds and timelines
- Following system
- Reactions and interactions
- Direct messaging
- Content creation

**Continue to front3.md for Phase 3 Social Features...**