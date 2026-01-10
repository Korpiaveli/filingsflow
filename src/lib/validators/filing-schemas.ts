import { z } from 'zod'

export const SECValidation = {
  cik: z.string().regex(/^0{0,10}\d{1,10}$/, 'CIK must be 1-10 digits, optionally zero-padded'),

  cikNormalized: z.string().transform((val) => val.replace(/^0+/, '').padStart(10, '0')),

  accessionNumber: z.string().regex(
    /^\d{10}-\d{2}-\d{6}$/,
    'Accession number must be in format NNNNNNNNNN-NN-NNNNNN'
  ),

  ticker: z.string()
    .min(1)
    .max(5)
    .regex(/^[A-Z]{1,5}$/, 'Ticker must be 1-5 uppercase letters')
    .transform((val) => val.toUpperCase()),

  formType: z.enum(['3', '4', '5', '13F-HR', '10-K', '10-Q', '8-K', 'SC 13G', 'SC 13D']),

  insiderFormType: z.enum(['3', '4', '5']),

  transactionCode: z.enum([
    'P', 'S', 'A', 'D', 'F', 'I', 'M', 'C', 'E', 'H', 'O', 'X', 'G', 'L', 'W', 'Z', 'J', 'K', 'U'
  ]),

  ownershipType: z.enum(['D', 'I']),

  insiderTitle: z.string()
    .max(100)
    .optional()
    .transform((val) => val?.trim() || null),

  companyName: z.string()
    .min(1)
    .max(200)
    .transform((val) => val.trim()),

  insiderName: z.string()
    .min(1)
    .max(200)
    .transform((val) => val.trim()),

  shares: z.number().int().nonnegative(),

  pricePerShare: z.number().nonnegative().optional(),

  totalValue: z.number().nonnegative().optional(),

  filingDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Date must be in YYYY-MM-DD format'
  ),

  transactionDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Date must be in YYYY-MM-DD format'
  ).optional(),
}

export const InsiderTransactionSchema = z.object({
  id: z.string().uuid().optional(),
  accession_number: SECValidation.accessionNumber,
  ticker: SECValidation.ticker,
  company_cik: SECValidation.cik,
  company_name: SECValidation.companyName.optional(),
  insider_cik: SECValidation.cik,
  insider_name: SECValidation.insiderName,
  insider_title: SECValidation.insiderTitle,
  is_officer: z.boolean().default(false),
  is_director: z.boolean().default(false),
  is_ten_percent_owner: z.boolean().default(false),
  transaction_type: SECValidation.transactionCode,
  transaction_date: SECValidation.transactionDate,
  shares: SECValidation.shares,
  price_per_share: SECValidation.pricePerShare,
  ownership_type: SECValidation.ownershipType.optional(),
  filed_at: z.string().datetime().optional(),
})

export const InstitutionalHoldingSchema = z.object({
  id: z.string().uuid().optional(),
  accession_number: SECValidation.accessionNumber,
  filer_cik: SECValidation.cik,
  filer_name: z.string().min(1).max(200),
  ticker: SECValidation.ticker,
  company_cik: SECValidation.cik,
  company_name: SECValidation.companyName.optional(),
  shares: SECValidation.shares,
  value: z.number().nonnegative(),
  report_date: SECValidation.filingDate,
  filed_at: z.string().datetime().optional(),
})

export const FilingQuerySchema = z.object({
  ticker: SECValidation.ticker.optional(),
  cik: SECValidation.cik.optional(),
  formType: SECValidation.formType.optional(),
  startDate: SECValidation.filingDate.optional(),
  endDate: SECValidation.filingDate.optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
})

export interface InsiderRelationship {
  insiderCik: string
  insiderName: string
  companyCik: string
  companyName: string
  ticker: string
  title: string | null
  isOfficer: boolean
  isDirector: boolean
  isTenPercentOwner: boolean
}

export const InsiderRelationshipSchema = z.object({
  insiderCik: SECValidation.cik,
  insiderName: SECValidation.insiderName,
  companyCik: SECValidation.cik,
  companyName: SECValidation.companyName,
  ticker: SECValidation.ticker,
  title: SECValidation.insiderTitle,
  isOfficer: z.boolean(),
  isDirector: z.boolean(),
  isTenPercentOwner: z.boolean(),
})

export function validateInsiderRelationship(
  insiderCik: string,
  companyCik: string,
  transactionCompanyCik: string
): { valid: boolean; reason?: string } {
  if (companyCik !== transactionCompanyCik) {
    return {
      valid: false,
      reason: `Insider CIK ${insiderCik} is affiliated with company ${companyCik}, not ${transactionCompanyCik}`,
    }
  }
  return { valid: true }
}

export function normalizeCik(cik: string): string {
  return cik.replace(/^0+/, '').padStart(10, '0')
}

export function compareCiks(cik1: string, cik2: string): boolean {
  return normalizeCik(cik1) === normalizeCik(cik2)
}

export function validateTitleForCompany(
  title: string | null | undefined,
  insiderCompanyCik: string,
  transactionCompanyCik: string
): { titleValid: boolean; displayTitle: string | null } {
  if (!title) {
    return { titleValid: true, displayTitle: null }
  }

  if (!compareCiks(insiderCompanyCik, transactionCompanyCik)) {
    return { titleValid: false, displayTitle: null }
  }

  return { titleValid: true, displayTitle: title }
}

export type InsiderTransaction = z.infer<typeof InsiderTransactionSchema>
export type InstitutionalHolding = z.infer<typeof InstitutionalHoldingSchema>
export type FilingQuery = z.infer<typeof FilingQuerySchema>
