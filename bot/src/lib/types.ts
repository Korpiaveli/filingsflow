import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js'

export interface Command {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>
}

export interface FilingResult {
  id: string
  ticker: string | null
  companyName: string | null
  formType: string
  filedAt: string
  filerName: string | null
  aiSummary: string | null
  fileUrl: string | null
}

export interface TransactionResult {
  id: string
  ticker: string
  companyName: string | null
  insiderName: string
  insiderTitle: string | null
  transactionType: string
  transactionDate: string | null
  shares: number | null
  pricePerShare: number | null
  totalValue: number | null
}

export interface HoldingResult {
  id: string
  fundName: string | null
  fundCik: string
  ticker: string | null
  issuerName: string
  shares: number
  valueUsd: number
  reportDate: string
}

export interface WhaleResult {
  fundName: string | null
  fundCik: string
  shares: number
  valueUsd: number
  reportDate: string
  previousShares?: number | null
  previousValue?: number | null
  changePercent?: number | null
  isNew?: boolean
}

export interface ClusterInfo {
  insiderCount: number
  totalValue: number
  timeframeDays: number
  participants: Array<{
    name: string
    title: string | null
    value: number
  }>
  discretionaryCount: number
  totalTransactions: number
}

export interface TransactionMetrics {
  sizeMultiplier: number | null
  percentileRank: number | null
  daysSinceLastTrade: number | null
  clusterInfo: ClusterInfo | null
  ownershipChangePercent: number | null
  is10b51Plan: boolean
  isOfficer: boolean
  isDirector: boolean
  sharesOwnedAfter: number | null
}

export interface NewsItem {
  source: 'yahoo' | 'google' | 'sec_8k'
  title: string
  url: string
  publishedAt: Date
  snippet: string | null
}

export interface NewsContext {
  recentNews: NewsItem[]
  has8K: boolean
  latestNewsAge: number | null
}

export interface EnhancedTransactionResult extends TransactionResult {
  insiderCik?: string
  isOfficer?: boolean
  isDirector?: boolean
  is10b51Plan?: boolean
  sharesOwnedAfter?: number | null
  directOrIndirect?: 'D' | 'I' | null
}

export interface QuarterlyActivity {
  increased: number
  decreased: number
  newPositions: number
  exited: number
  totalFunds: number
}
