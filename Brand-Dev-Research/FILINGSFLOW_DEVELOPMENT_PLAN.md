# FilingsFlow Development Plan

## For: Claude Code / VS Code Development
## Version: 1.0 | January 2026

---

## Project Context

FilingsFlow is a Discord-native SEC filing intelligence platform targeting retail traders. The product polls SEC EDGAR for Form 4/3/5 filings every 60 seconds, generates AI summaries, detects insider trading clusters, and delivers alerts via Discord.

**Current State**: Core functionality works (polling, summaries, Discord bot, cluster detection). However, the pricing page makes claims for features that don't exist, and growth mechanics (referrals, gamification) are missing.

**Business Goal**: Reach $25-50K MRR within 12 months via Discord-native distribution.

---

## Phase 0: Integrity Fixes (Priority: CRITICAL)

These must be completed before any marketing spend. The pricing page currently promises features that don't exist.

### Task 0.1: Fix Pricing Page Claims

**File**: `src/app/page.tsx` (or equivalent pricing component)

**Current (FALSE)**:
```typescript
// Pro tier
features={[
  '50 watchlist tickers',  // Actually enforces 25
  // ...
]}

// Premium tier  
features={[
  'Unlimited tickers',      // Actually capped at 100
  'API access',             // Doesn't exist
  'Historical backtesting', // Doesn't exist
  'Portfolio sync',         // Doesn't exist
]}
```

**Required Changes**:
```typescript
// Pro tier
features={[
  '25 watchlist tickers',  // Match actual code enforcement
  'Real-time alerts',
  'Cluster detection',
  'Email digest',
]}

// Premium tier → rename to "Pro" 
features={[
  '100 watchlist tickers', // Match actual limit
  'Everything in Basic',
  'Priority support',
  'Early access to new features',
]}
```

**Validation**: Search codebase for tier limit enforcement and ensure pricing page matches.

### Task 0.2: Audit Tier Limit Enforcement

**Goal**: Verify watchlist limits match what we claim.

**Search for**:
- Watchlist creation/update functions
- Tier validation logic
- Constants defining limits per tier

**Expected enforcement**:
| Tier | Claimed | Must Enforce |
|------|---------|--------------|
| Free | 5 | 5 |
| Basic | 25 | 25 |
| Pro | 100 | 100 |

---

## Phase 1: Viral Growth Mechanics (Priority: HIGH)

### Task 1.1: /invite Discord Command

**Purpose**: Enable users to share FilingsFlow with one command. Track referral source.

**Implementation**:

```typescript
// Discord slash command
import { SlashCommandBuilder } from 'discord.js';

export const inviteCommand = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get a link to invite FilingsFlow to your server'),
  
  async execute(interaction) {
    const userId = interaction.user.id visitorId;
    const referralCode = generateReferralCode(userId);
    
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=${PERMISSIONS}&scope=bot%20applications.commands&ref=${referralCode}`;
    
    await interaction.reply({
      content: `🚀 **Invite FilingsFlow to your server:**\n${inviteUrl}\n\n*Your referral code: \`${referralCode}\`*`,
      ephemeral: true
    });
    
    // Track invite generation
    await trackEvent('invite_generated', { userId, referralCode });
  }
};
```

**Database Schema**:
```sql
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Stats
  clicks INTEGER DEFAULT 0,
  signups INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0
);

CREATE INDEX idx_referral_user ON referral_codes(user_id);
CREATE INDEX idx_referral_code ON referral_codes(code);
```

**Effort**: 2-4 hours

---

### Task 1.2: "Powered by FilingsFlow" Embed Footer

**Purpose**: Every Discord alert becomes marketing. Subtle branding with invite link.

**Current embed structure** (find in codebase):
```typescript
const embed = new EmbedBuilder()
  .setTitle(...)
  .setDescription(...)
  .setFields(...)
  // ADD THIS:
  .setFooter({ 
    text: '📊 Powered by FilingsFlow • /invite to add to your server',
    iconURL: 'https://filingsflow.com/icon.png'
  });
```

**Effort**: 30 minutes

---

### Task 1.3: Referral Tracking System

**Purpose**: Track referrals, attribute conversions, enable reward tiers.

**Database Schema**:
```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id VARCHAR(255) NOT NULL,
  referred_id VARCHAR(255) NOT NULL,
  referral_code VARCHAR(20) NOT NULL,
  
  -- Tracking
  signup_at TIMESTAMP DEFAULT NOW(),
  converted_at TIMESTAMP,  -- When referred user paid
  conversion_tier VARCHAR(50),  -- Which tier they converted to
  
  -- Rewards
  reward_granted BOOLEAN DEFAULT FALSE,
  reward_type VARCHAR(50),
  
  FOREIGN KEY (referral_code) REFERENCES referral_codes(code)
);

CREATE TABLE referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  reward_type VARCHAR(50) NOT NULL,  -- 'free_month_basic', 'free_month_pro', 'lifetime_basic', etc.
  granted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  redeemed BOOLEAN DEFAULT FALSE
);
```

**Reward Tiers** (business context for logic):
| Referrals | Reward |
|-----------|--------|
| 5 | 1 month free Basic |
| 15 | 1 month free Pro |
| 30 | Lifetime Basic + 'Ambassador' badge |
| 50 | Lifetime Pro + exclusive Discord role |

**API Endpoints**:
```typescript
// GET /api/referrals/stats
// Returns: { totalReferrals, conversions, currentTier, nextTierAt, rewards[] }

// POST /api/referrals/claim
// Body: { rewardId }
// Claims an available reward
```

**Effort**: 1-2 weeks

---

### Task 1.4: Referral Dashboard UI

**Purpose**: Let users see their referral stats and claim rewards.

**Location**: Settings page or dedicated `/referrals` route

**Components needed**:
```typescript
// ReferralStats.tsx
interface ReferralStatsProps {
  totalReferrals: number;
  conversions: number;
  pendingRewards: Reward[];
  claimedRewards: Reward[];
  referralCode: string;
  referralLink: string;
}

// Progress bar showing distance to next tier
// Copy button for referral link
// List of rewards with claim buttons
```

**Effort**: 1 week (including design)

---

## Phase 2: AI Features

### Task 2.1: AI Education Bot

**Purpose**: 24/7 support for SEC terminology and filing interpretation. Users ask "What does 10b5-1 mean?" and get instant, accurate answers.

**Architecture**:
```
User question → Intent classification → RAG retrieval → Response generation
```

**Knowledge Base Sources** (to ingest):
1. SEC Form 4 documentation
2. SEC glossary of terms
3. FilingsFlow's own help docs
4. Common Q&A from support tickets
5. Insider trading terminology guide

**Implementation Options**:

**Option A: RAG with embeddings**
```typescript
// Using OpenAI embeddings + Pinecone/Supabase pgvector
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';

const embeddings = new OpenAIEmbeddings();
const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
  pineconeIndex,
  namespace: 'sec-knowledge'
});

async function answerQuestion(question: string) {
  const relevantDocs = await vectorStore.similaritySearch(question, 3);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: EDUCATION_BOT_PROMPT },
      { role: 'user', content: `Context:\n${relevantDocs.map(d => d.pageContent).join('\n\n')}\n\nQuestion: ${question}` }
    ]
  });
  
  return response.choices[0].message.content;
}
```

**Option B: Fine-tuned model** (higher quality, higher cost)
- Fine-tune GPT-4o-mini on SEC Q&A dataset
- Better for consistent terminology
- Requires curated training data

**Discord Integration**:
```typescript
// /explain command
export const explainCommand = {
  data: new SlashCommandBuilder()
    .setName('explain')
    .setDescription('Get an explanation of SEC filing terms')
    .addStringOption(option =>
      option.setName('term')
        .setDescription('The term or concept to explain')
        .setRequired(true)),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    const term = interaction.options.getString('term');
    const explanation = await answerQuestion(term);
    
    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle(`📚 ${term}`)
        .setDescription(explanation)
        .setColor(0x2E7D32)
        .setFooter({ text: 'FilingsFlow Education Bot' })]
    });
  }
};
```

**Effort**: 2 weeks

---

## Phase 3: Gamification Layer

**Business Context**: Retention is critical. B2C SaaS averages 6-8% monthly churn. Gamification can reduce this by creating engagement habits.

### Task 3.1: Engagement Streak Tracking

**Database Schema**:
```sql
CREATE TABLE user_engagement (
  user_id VARCHAR(255) PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  total_active_days INTEGER DEFAULT 0,
  
  -- Milestones
  streak_7_achieved BOOLEAN DEFAULT FALSE,
  streak_30_achieved BOOLEAN DEFAULT FALSE,
  streak_60_achieved BOOLEAN DEFAULT FALSE,
  streak_90_achieved BOOLEAN DEFAULT FALSE
);

CREATE TABLE engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,  -- 'login', 'view_alert', 'use_command', etc.
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Streak Logic**:
```typescript
async function updateStreak(userId: string) {
  const engagement = await db.userEngagement.findUnique({ where: { userId } });
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  if (engagement.lastActiveDate === today) {
    return; // Already counted today
  }
  
  let newStreak = 1;
  if (engagement.lastActiveDate === yesterday) {
    newStreak = engagement.currentStreak + 1;
  }
  
  await db.userEngagement.update({
    where: { userId },
    data: {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, engagement.longestStreak),
      lastActiveDate: today,
      totalActiveDays: engagement.totalActiveDays + 1,
      // Check milestones
      streak_7_achieved: newStreak >= 7 || engagement.streak_7_achieved,
      streak_30_achieved: newStreak >= 30 || engagement.streak_30_achieved,
      // ... etc
    }
  });
  
  // Check for new milestone achievements
  await checkAndGrantBadges(userId, newStreak);
}
```

**Effort**: 3-4 days

---

### Task 3.2: Achievement Badges

**Database Schema**:
```sql
CREATE TABLE badges (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url VARCHAR(255),
  category VARCHAR(50),  -- 'streak', 'engagement', 'referral', 'milestone'
  requirement_type VARCHAR(50),
  requirement_value INTEGER
);

CREATE TABLE user_badges (
  user_id VARCHAR(255) NOT NULL,
  badge_id VARCHAR(50) NOT NULL,
  earned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

-- Seed badges
INSERT INTO badges (id, name, description, category, requirement_type, requirement_value) VALUES
  ('first_alert', 'First Alert', 'Received your first filing alert', 'milestone', 'alerts_received', 1),
  ('century', 'Century Club', 'Received 100 filing alerts', 'milestone', 'alerts_received', 100),
  ('streak_7', 'Week Warrior', '7-day engagement streak', 'streak', 'streak_days', 7),
  ('streak_30', 'Monthly Maven', '30-day engagement streak', 'streak', 'streak_days', 30),
  ('cluster_spotter', 'Cluster Spotter', 'Viewed 10 cluster alerts', 'engagement', 'clusters_viewed', 10),
  ('referrer_5', 'Networker', 'Referred 5 users', 'referral', 'referrals', 5),
  ('referrer_30', 'Ambassador', 'Referred 30 users', 'referral', 'referrals', 30);
```

**Badge Display in Discord**:
```typescript
// /profile command shows badges
const badgeEmojis = {
  'first_alert': '🔔',
  'century': '💯',
  'streak_7': '🔥',
  'streak_30': '⚡',
  'cluster_spotter': '🎯',
  'referrer_5': '🤝',
  'referrer_30': '👑'
};

function formatBadges(badges: Badge[]): string {
  return badges.map(b => `${badgeEmojis[b.id]} ${b.name}`).join(' • ');
}
```

**Effort**: 3-4 days

---

### Task 3.3: Leaderboards

**Types**:
1. **Weekly Top Engagers** - Most active users this week
2. **Top Referrers** - Most successful referrals
3. **Longest Streaks** - Current streak leaders

**API Endpoint**:
```typescript
// GET /api/leaderboards/:type
// Returns top 10 for the specified leaderboard

async function getLeaderboard(type: 'engagement' | 'referrals' | 'streaks') {
  switch (type) {
    case 'engagement':
      return db.userEngagement.findMany({
        orderBy: { totalActiveDays: 'desc' },
        take: 10,
        select: { userId: true, totalActiveDays: true }
      });
    case 'referrals':
      return db.referralCodes.findMany({
        orderBy: { conversions: 'desc' },
        take: 10,
        select: { userId: true, conversions: true }
      });
    case 'streaks':
      return db.userEngagement.findMany({
        orderBy: { currentStreak: 'desc' },
        take: 10,
        select: { userId: true, currentStreak: true }
      });
  }
}
```

**Discord Command**:
```typescript
// /leaderboard [type]
// Displays formatted leaderboard embed
```

**Effort**: 2-3 days

---

## Phase 4: Content Automation System

**Business Context**: Documentary-style case study videos are the most effective content format for 2025. Rather than building video production capabilities, we automate the research and brief generation, then use tools like Sora for video creation.

### Task 4.1: Brand Style Guide System

**Purpose**: Ensure all generated content (briefs, scripts, visuals) has consistent look and feel.

**Brand Configuration File**: `config/brand-style.json`
```json
{
  "brand": {
    "name": "FilingsFlow",
    "tagline": "Real-time SEC intelligence, delivered where you trade",
    "voice": {
      "tone": ["professional", "accessible", "data-driven", "slightly irreverent"],
      "avoid": ["hype", "get-rich-quick language", "financial advice"],
      "personality": "Smart friend who happens to be a SEC filing expert"
    }
  },
  "visual": {
    "colors": {
      "primary": "#1E3A5F",
      "secondary": "#2E7D32", 
      "accent": "#FF6B35",
      "background": "#0D1117",
      "text": "#E6EDF3"
    },
    "typography": {
      "headings": "Inter Bold",
      "body": "Inter Regular",
      "data": "JetBrains Mono"
    },
    "motifs": [
      "Clean data visualizations",
      "Stock chart overlays",
      "Terminal/code aesthetic",
      "Subtle grid backgrounds"
    ]
  },
  "video": {
    "style": "Documentary / data journalism",
    "pacing": "Fast cuts, 2-3 seconds per shot",
    "music": "Electronic ambient, building tension",
    "textOverlays": {
      "font": "Inter Bold",
      "animation": "Fade in from bottom, subtle scale",
      "duration": "2-3 seconds"
    },
    "dataVisuals": {
      "style": "Clean, minimal, dark background",
      "animation": "Numbers count up, charts animate in",
      "colors": "Use brand accent for highlights"
    },
    "transitions": ["Cut", "Fade through black", "Data wipe"],
    "avoid": ["Cheap stock footage", "Generic corporate music", "Slow pacing"]
  },
  "contentTypes": {
    "caseStudy": {
      "duration": "45-90 seconds",
      "structure": ["Hook (5s)", "Setup (15s)", "Data reveal (20s)", "Outcome (15s)", "CTA (5s)"],
      "hookStyles": ["Provocative question", "Surprising statistic", "Timeline countdown"]
    },
    "clusterAlert": {
      "duration": "30-45 seconds", 
      "structure": ["Alert intro (5s)", "Who bought (10s)", "Pattern context (15s)", "What to watch (10s)"]
    },
    "weeklyRecap": {
      "duration": "2-3 minutes",
      "structure": ["Top 5 countdown", "Each with 20-30s segment", "Outro with CTA"]
    }
  }
}
```

**Effort**: 1-2 days (config creation and validation)

---

### Task 4.2: Case Study Research Pipeline

**Purpose**: Automatically identify compelling insider trading stories from our data.

**Triggers for case study candidates**:
1. Large transaction (top 1% by value)
2. Cluster activity (3+ insiders same stock)
3. Significant price movement post-filing
4. Notable insider (CEO, activist investor, politician)
5. Contrarian signal (buying during selloff)

**Database Schema**:
```sql
CREATE TABLE case_study_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id VARCHAR(255) NOT NULL,
  ticker VARCHAR(10) NOT NULL,
  
  -- Scoring
  score DECIMAL(5,2),
  trigger_type VARCHAR(50),  -- 'large_transaction', 'cluster', 'price_movement', etc.
  
  -- Research data (populated by pipeline)
  insider_name VARCHAR(255),
  insider_title VARCHAR(255),
  transaction_value DECIMAL(15,2),
  transaction_date DATE,
  price_at_filing DECIMAL(10,2),
  price_7d_later DECIMAL(10,2),
  price_30d_later DECIMAL(10,2),
  price_change_pct DECIMAL(5,2),
  
  -- Context
  news_headlines JSONB,  -- Array of relevant headlines
  historical_pattern TEXT,  -- AI-generated pattern analysis
  cluster_participants JSONB,  -- If cluster, who else
  
  -- Status
  status VARCHAR(20) DEFAULT 'candidate',  -- 'candidate', 'researched', 'brief_generated', 'produced', 'published'
  created_at TIMESTAMP DEFAULT NOW(),
  researched_at TIMESTAMP,
  brief_generated_at TIMESTAMP
);

CREATE INDEX idx_candidates_score ON case_study_candidates(score DESC);
CREATE INDEX idx_candidates_status ON case_study_candidates(status);
```

**Scoring Algorithm**:
```typescript
interface CandidateScore {
  baseScore: number;
  factors: {
    transactionSize: number;      // 0-25 points
    priceMovement: number;        // 0-25 points  
    insiderNotability: number;    // 0-20 points
    patternUniqueness: number;    // 0-15 points
    narrativeStrength: number;    // 0-15 points (AI-assessed)
  };
}

async function scoreCandidate(filing: Filing): Promise<CandidateScore> {
  const factors = {
    // Transaction size scoring
    transactionSize: scoreTransactionSize(filing.value),
    
    // Price movement (requires fetching price data)
    priceMovement: await scorePriceMovement(filing.ticker, filing.date),
    
    // Insider notability
    insiderNotability: scoreInsiderRole(filing.insiderTitle, filing.insiderName),
    
    // Pattern uniqueness (is this unusual for this insider/company?)
    patternUniqueness: await scorePatternUniqueness(filing),
    
    // Narrative strength (AI assessment)
    narrativeStrength: await assessNarrativeStrength(filing)
  };
  
  return {
    baseScore: Object.values(factors).reduce((a, b) => a + b, 0),
    factors
  };
}

function scoreTransactionSize(value: number): number {
  if (value >= 10_000_000) return 25;
  if (value >= 5_000_000) return 20;
  if (value >= 1_000_000) return 15;
  if (value >= 500_000) return 10;
  if (value >= 100_000) return 5;
  return 0;
}
```

**Effort**: 1 week

---

### Task 4.3: Video Director Brief Generator

**Purpose**: Generate detailed briefs that can be fed to Sora or provided to human editors.

**Brief Structure**:
```typescript
interface VideoDirectorBrief {
  metadata: {
    id: string;
    candidateId: string;
    generatedAt: Date;
    contentType: 'caseStudy' | 'clusterAlert' | 'weeklyRecap';
    targetDuration: number;  // seconds
  };
  
  narrative: {
    hook: string;           // Opening line/visual
    thesis: string;         // Core story in one sentence
    arc: string[];          // Scene-by-scene narrative beats
    cta: string;            // Closing call to action
  };
  
  script: {
    voiceover: string;      // Full VO script with timestamps
    onScreenText: {         // Text overlays
      timestamp: number;
      text: string;
      style: 'headline' | 'data' | 'quote';
    }[];
  };
  
  visuals: {
    scenes: {
      timestamp: number;
      duration: number;
      description: string;  // What Sora should generate
      style: string;        // Visual style reference
      dataOverlay?: {       // If showing data
        type: 'chart' | 'number' | 'comparison';
        data: any;
      };
    }[];
  };
  
  audio: {
    musicMood: string;
    musicTempo: string;
    soundEffects: {
      timestamp: number;
      effect: string;
    }[];
  };
  
  brandCompliance: {
    colorPalette: string[];
    fonts: string[];
    motifs: string[];
    avoidList: string[];
  };
  
  soraPrompts: {           // Ready-to-use Sora prompts for each scene
    sceneId: number;
    prompt: string;
  }[];
}
```

**Generation Pipeline**:
```typescript
async function generateVideoBrief(candidateId: string): Promise<VideoDirectorBrief> {
  const candidate = await db.caseStudyCandidates.findUnique({ where: { id: candidateId } });
  const brandStyle = loadBrandStyle();
  
  // Step 1: Generate narrative structure
  const narrative = await generateNarrative(candidate, brandStyle);
  
  // Step 2: Write voiceover script
  const script = await generateScript(candidate, narrative, brandStyle);
  
  // Step 3: Plan visual scenes
  const visuals = await planVisuals(candidate, narrative, script, brandStyle);
  
  // Step 4: Generate Sora prompts for each scene
  const soraPrompts = await generateSoraPrompts(visuals, brandStyle);
  
  // Step 5: Plan audio
  const audio = planAudio(narrative, brandStyle);
  
  return {
    metadata: {
      id: generateId(),
      candidateId,
      generatedAt: new Date(),
      contentType: 'caseStudy',
      targetDuration: brandStyle.contentTypes.caseStudy.duration
    },
    narrative,
    script,
    visuals,
    audio,
    brandCompliance: {
      colorPalette: Object.values(brandStyle.visual.colors),
      fonts: Object.values(brandStyle.visual.typography),
      motifs: brandStyle.visual.motifs,
      avoidList: brandStyle.video.avoid
    },
    soraPrompts
  };
}
```

**AI Prompt for Narrative Generation**:
```typescript
const NARRATIVE_PROMPT = `You are a documentary video director specializing in financial storytelling.

Given the following insider trading data, create a compelling 60-second video narrative:

FILING DATA:
{candidateData}

BRAND VOICE:
{brandVoice}

VIDEO STRUCTURE (45-90 seconds):
1. Hook (5s) - Grab attention immediately
2. Setup (15s) - Who is this insider? What did they do?
3. Data Reveal (20s) - The numbers that matter
4. Outcome (15s) - What happened next?
5. CTA (5s) - FilingsFlow pitch

Generate:
1. A hook that creates immediate intrigue (question, surprising stat, or countdown)
2. A one-sentence thesis
3. 5 narrative beats (one per section)
4. A natural CTA that doesn't feel salesy

Output as JSON matching the VideoNarrative interface.`;
```

**Sora Prompt Generation**:
```typescript
async function generateSoraPrompt(scene: Scene, brandStyle: BrandStyle): Promise<string> {
  const basePrompt = `Cinematic shot, ${brandStyle.video.style} style. `;
  const colorContext = `Color palette: dark background (${brandStyle.visual.colors.background}), accent highlights (${brandStyle.visual.colors.accent}). `;
  const avoidContext = `Avoid: ${brandStyle.video.avoid.join(', ')}. `;
  
  // Scene-specific prompt
  let scenePrompt = '';
  
  switch (scene.type) {
    case 'data_reveal':
      scenePrompt = `Clean data visualization emerging from darkness. Numbers counting up to ${scene.data.value}. Subtle grid background. Terminal/code aesthetic. Professional financial data journalism style.`;
      break;
    case 'stock_chart':
      scenePrompt = `Animated stock chart showing price movement from $${scene.data.startPrice} to $${scene.data.endPrice}. Green upward trend line. Dark background with subtle glow. Fast, dynamic camera push-in.`;
      break;
    case 'insider_intro':
      scenePrompt = `Professional corporate portrait style. Silhouette or abstract representation of executive figure. Name and title appearing with subtle animation. Serious, documentary tone.`;
      break;
    // ... more scene types
  }
  
  return basePrompt + colorContext + scenePrompt + avoidContext;
}
```

**Effort**: 2 weeks

---

### Task 4.4: Brief Output & Export

**Purpose**: Export briefs in formats usable by different workflows.

**Export Formats**:

1. **JSON** - For programmatic use (Sora API, automation)
2. **Markdown** - For human review and editing
3. **PDF** - For sharing with external video editors

**Markdown Export Template**:
```typescript
function exportBriefAsMarkdown(brief: VideoDirectorBrief): string {
  return `# Video Brief: ${brief.narrative.thesis}

## Metadata
- **Content Type**: ${brief.metadata.contentType}
- **Target Duration**: ${brief.metadata.targetDuration}s
- **Generated**: ${brief.metadata.generatedAt}

## Narrative

### Hook
> ${brief.narrative.hook}

### Story Arc
${brief.narrative.arc.map((beat, i) => `${i + 1}. ${beat}`).join('\n')}

### Call to Action
> ${brief.narrative.cta}

---

## Voiceover Script

\`\`\`
${brief.script.voiceover}
\`\`\`

## On-Screen Text
| Timestamp | Text | Style |
|-----------|------|-------|
${brief.script.onScreenText.map(t => `| ${t.timestamp}s | ${t.text} | ${t.style} |`).join('\n')}

---

## Visual Scenes

${brief.visuals.scenes.map((scene, i) => `
### Scene ${i + 1} (${scene.timestamp}s - ${scene.timestamp + scene.duration}s)
**Description**: ${scene.description}
**Style**: ${scene.style}
${scene.dataOverlay ? `**Data**: ${JSON.stringify(scene.dataOverlay)}` : ''}
`).join('\n')}

---

## Sora Prompts

${brief.soraPrompts.map(p => `
### Scene ${p.sceneId}
\`\`\`
${p.prompt}
\`\`\`
`).join('\n')}

---

## Brand Compliance Checklist
- [ ] Colors: ${brief.brandCompliance.colorPalette.join(', ')}
- [ ] Fonts: ${brief.brandCompliance.fonts.join(', ')}
- [ ] Motifs: ${brief.brandCompliance.motifs.join(', ')}
- [ ] Avoided: ${brief.brandCompliance.avoidList.join(', ')}
`;
}
```

**Effort**: 2-3 days

---

## Phase 5: Premium Features (Future)

These features were promised on the pricing page but don't exist. Build only after integrity fixes and growth mechanics.

### Task 5.1: API v1 Endpoints (3 weeks)

**Endpoints**:
- `GET /api/v1/filings` - Query filings by ticker/date/form
- `GET /api/v1/insiders` - Query insider transactions
- `GET /api/v1/13f` - Query institutional holdings
- `POST /api/v1/webhooks` - Register webhook for real-time alerts

**Infrastructure**:
- API key generation and management
- Rate limiting (1K/day Basic, 10K/day Pro, 100K/day Enterprise)
- Usage tracking and billing

### Task 5.2: Historical Backtesting (4 weeks)

**Feature**: "What if you bought every stock with 3+ insider buys?"

**Components**:
- Historical data ingestion (need to backfill data)
- Backtesting engine
- Results visualization
- Shareable reports

### Task 5.3: Congressional Trading Tracker (2 weeks)

**Purpose**: High viral potential. Monthly reports generate press coverage.

**Data Source**: House/Senate financial disclosures
**Output**: Monthly report + real-time alerts when politicians file

---

## Development Priorities Summary

| Phase | Task | Priority | Effort | Dependencies |
|-------|------|----------|--------|--------------|
| 0 | Fix pricing page | CRITICAL | 2 hours | None |
| 0 | Audit tier limits | CRITICAL | 2 hours | None |
| 1 | /invite command | HIGH | 4 hours | None |
| 1 | Embed footer branding | HIGH | 30 min | None |
| 1 | Referral system | HIGH | 1-2 weeks | /invite |
| 2 | AI Education Bot | MEDIUM | 2 weeks | None |
| 3 | Streak tracking | MEDIUM | 3-4 days | None |
| 3 | Achievement badges | MEDIUM | 3-4 days | Streaks |
| 3 | Leaderboards | MEDIUM | 2-3 days | Streaks, badges |
| 4 | Brand style guide | MEDIUM | 1-2 days | None |
| 4 | Case study pipeline | MEDIUM | 1 week | None |
| 4 | Video brief generator | LOW | 2 weeks | Style guide, pipeline |
| 5 | API v1 | LOW | 3 weeks | None |
| 5 | Backtesting | LOW | 4 weeks | Historical data |
| 5 | Congressional tracker | LOW | 2 weeks | Data source |

---

## Technical Notes

### Environment Variables Needed
```bash
# Discord
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# Database
DATABASE_URL=

# AI
OPENAI_API_KEY=
# or
ANTHROPIC_API_KEY=

# SEC Data
SEC_API_KEY=  # If using SEC-API.io

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Vector DB (for RAG)
PINECONE_API_KEY=
PINECONE_INDEX=
```

### Tech Stack Assumptions
- **Framework**: Next.js or similar
- **Database**: PostgreSQL with Prisma
- **Discord**: discord.js v14+
- **AI**: OpenAI API or Anthropic Claude
- **Payments**: Stripe

---

## Questions for Product Team

Before starting development:

1. **Pricing page**: Do we want to remove Premium tier entirely, or rename/restructure?
2. **Referral rewards**: Confirm the reward tiers (5/15/30/50) are acceptable cost-wise
3. **AI Education Bot**: Should it be a separate command (/explain) or integrated into help?
4. **Video briefs**: Who will execute the briefs? Human editors or Sora automation?
5. **API**: Should we build API before other features to unblock Premium tier claims?

---

*Document generated for Claude Code development reference. Last updated: January 2026*
