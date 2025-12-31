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
}
