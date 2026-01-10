import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Tables } from '@/types/database'
import { formatInsiderForAI, type InsiderDisplayContext } from '@/lib/utils/format-insider'

type Filing = Tables<'filings'>
type Transaction = Tables<'insider_transactions'>

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

interface FilingWithTransactions extends Filing {
  insider_transactions: Transaction[]
}

export async function generateFilingSummary(
  filing: FilingWithTransactions
): Promise<string | null> {
  if (!process.env.GOOGLE_AI_API_KEY) {
    console.warn('GOOGLE_AI_API_KEY not set, skipping summary generation')
    return null
  }

  const transactions = filing.insider_transactions || []

  if (transactions.length === 0) {
    return null
  }

  const totalBuys = transactions
    .filter((t) => ['P', 'A', 'M'].includes(t.transaction_type))
    .reduce((sum, t) => sum + (t.total_value || 0), 0)

  const totalSells = transactions
    .filter((t) => ['S', 'D', 'F'].includes(t.transaction_type))
    .reduce((sum, t) => sum + (t.total_value || 0), 0)

  const insiderName = transactions[0]?.insider_name || 'Unknown insider'
  const insiderTitle = transactions[0]?.insider_title || ''
  const isOfficer = transactions[0]?.is_officer || false
  const isDirector = transactions[0]?.is_director || false
  const isTenPercentOwner = transactions[0]?.is_ten_percent_owner || false
  const insiderCik = transactions[0]?.insider_cik || ''
  const companyCik = filing.cik || ''

  const insiderContext: InsiderDisplayContext = {
    insiderName,
    insiderTitle: insiderTitle || null,
    insiderCik,
    companyCik,
    companyName: filing.company_name || 'Unknown',
    ticker: filing.ticker || 'N/A',
    isOfficer,
    isDirector,
    isTenPercentOwner,
  }

  const formattedInsiderInfo = formatInsiderForAI(insiderContext)

  const transactionDetails = transactions
    .map((t) => {
      const type =
        t.transaction_type === 'P'
          ? 'purchased'
          : t.transaction_type === 'S'
            ? 'sold'
            : t.transaction_type === 'A'
              ? 'acquired via grant'
              : t.transaction_type === 'M'
                ? 'exercised options'
                : t.transaction_type === 'F'
                  ? 'disposed (tax)'
                  : 'transacted'

      return `- ${type} ${t.shares?.toLocaleString() || '?'} shares at $${t.price_per_share?.toFixed(2) || '?'} ($${t.total_value?.toLocaleString() || '?'} total)`
    })
    .join('\n')

  const prompt = `Summarize this SEC Form ${filing.form_type} filing using ONLY the facts provided below. Do not add any external information.

=== FILING DATA ===
${formattedInsiderInfo}
Filed: ${filing.filed_at}

Transactions:
${transactionDetails}

Net Activity: ${totalBuys > totalSells ? `$${(totalBuys - totalSells).toLocaleString()} net buying` : totalSells > totalBuys ? `$${(totalSells - totalBuys).toLocaleString()} net selling` : 'Neutral'}
=== END DATA ===

STRICT RULES:
- Use ONLY information from the data above
- The insider's title is ONLY valid for the company listed above - do NOT imply they hold this title at any other company
- Always include the company name when mentioning the insider's title (e.g., "NVIDIA CEO Jensen Huang" NOT just "CEO Jensen Huang")
- Do NOT speculate about reasons, motives, or market conditions
- Do NOT mention earnings, news, or events not in the data
- Do NOT provide investment advice or sentiment judgment
- If data shows "?" or "N/A", do not guess the value

Write exactly 1-2 sentences that state:
1. Who (name and company-qualified title if available) did what (bought/sold/granted)
2. The approximate value and share count

Example good output: "NVIDIA CEO Jensen Huang purchased 85,000 shares worth approximately $12.1M."
Example bad output: "CEO Jensen Huang purchased shares." (missing company context)
Example bad output: "CEO sold shares ahead of expected earnings decline." (speculation)

Summary:`

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 150,
        temperature: 0.1,
      },
    })

    const response = result.response
    const summary = response.text()?.trim() || null

    if (!summary) return null

    const validation = validateSummary(summary, {
      insiderName,
      companyName: filing.company_name,
      ticker: filing.ticker,
      totalBuys,
      totalSells,
    })

    if (!validation.isValid) {
      console.warn(`Summary validation failed: ${validation.reason}`)
      console.warn(`Rejected summary: ${summary}`)
      return null
    }

    return summary
  } catch (error) {
    console.error('Error generating summary:', error)
    return null
  }
}

interface ValidationContext {
  insiderName: string
  companyName: string | null
  ticker: string | null
  totalBuys: number
  totalSells: number
}

interface ValidationResult {
  isValid: boolean
  reason?: string
}

const HALLUCINATION_PATTERNS = [
  /\bearnings\b/i,
  /\bquarterly\s+results?\b/i,
  /\bbeat\s+expectations?\b/i,
  /\bmissed\s+expectations?\b/i,
  /\bmarket\s+conditions?\b/i,
  /\beconomic\b/i,
  /\binflation\b/i,
  /\brecession\b/i,
  /\bFed\b/,
  /\binterest\s+rates?\b/i,
  /\banalysts?\s+expect\b/i,
  /\bforecast\b/i,
  /\bguidance\b/i,
  /\boutlook\b/i,
  /\bsentiment\b/i,
  /\bbullish\b/i,
  /\bbearish\b/i,
  /\bconfidence\b/i,
  /\boptimis\w+\b/i,
  /\bpessimis\w+\b/i,
  /\bsignal(?:s|ing)?\s+(?:that|a)\b/i,
  /\bsuggests?\s+(?:that|the)\b/i,
  /\bindicates?\s+(?:that|the)\b/i,
  /\blikely\b/i,
  /\bprobably\b/i,
  /\bmay\s+be\s+(?:a\s+)?sign\b/i,
  /\bcould\s+(?:indicate|suggest|mean)\b/i,
  /\bahead\s+of\b/i,
  /\bfollowing\s+(?:the|a|recent)\b/i,
  /\bin\s+(?:anticipation|response)\b/i,
  /\bdue\s+to\b/i,
  /\bbecause\s+of\b/i,
]

const ADVICE_PATTERNS = [
  /\binvestors?\s+should\b/i,
  /\bconsider\s+(?:buying|selling)\b/i,
  /\bgood\s+(?:sign|news|opportunity)\b/i,
  /\bbad\s+(?:sign|news)\b/i,
  /\bworth\s+(?:watching|monitoring)\b/i,
  /\bkeep\s+an?\s+eye\b/i,
  /\bbe\s+(?:cautious|careful)\b/i,
  /\btake\s+(?:note|notice)\b/i,
]

function validateSummary(summary: string, context: ValidationContext): ValidationResult {
  if (summary.length > 300) {
    return { isValid: false, reason: 'Summary too long' }
  }

  if (summary.length < 20) {
    return { isValid: false, reason: 'Summary too short' }
  }

  for (const pattern of HALLUCINATION_PATTERNS) {
    if (pattern.test(summary)) {
      return { isValid: false, reason: `Contains speculative language: ${pattern.source}` }
    }
  }

  for (const pattern of ADVICE_PATTERNS) {
    if (pattern.test(summary)) {
      return { isValid: false, reason: `Contains investment advice: ${pattern.source}` }
    }
  }

  const totalActivity = context.totalBuys + context.totalSells
  if (totalActivity > 0) {
    const mentionedValues = summary.match(/\$[\d,.]+[MKB]?|\d+(?:,\d{3})*(?:\.\d+)?\s*(?:million|billion|thousand)?/gi) || []

    if (mentionedValues.length > 0) {
      for (const mentioned of mentionedValues) {
        const normalized = mentioned.replace(/[,$]/g, '').toLowerCase()
        let value = parseFloat(normalized)

        if (normalized.includes('m') || normalized.includes('million')) {
          value *= 1_000_000
        } else if (normalized.includes('b') || normalized.includes('billion')) {
          value *= 1_000_000_000
        } else if (normalized.includes('k') || normalized.includes('thousand')) {
          value *= 1_000
        }

        if (!isNaN(value) && value > totalActivity * 2) {
          return { isValid: false, reason: `Value ${mentioned} exceeds actual transaction total` }
        }
      }
    }
  }

  return { isValid: true }
}

export async function generateBatchSummaries(
  filings: FilingWithTransactions[]
): Promise<Map<string, string>> {
  const summaries = new Map<string, string>()

  for (const filing of filings) {
    if (filing.ai_summary) continue

    const summary = await generateFilingSummary(filing)
    if (summary) {
      summaries.set(filing.id, summary)
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return summaries
}
