import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Tables } from '@/types/database'

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
  const isOfficer = transactions[0]?.is_officer
  const isDirector = transactions[0]?.is_director

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

  const prompt = `Analyze this SEC Form ${filing.form_type} filing and provide a brief, actionable summary for investors.

Company: ${filing.company_name || 'Unknown'} (${filing.ticker || 'N/A'})
Insider: ${insiderName}${insiderTitle ? ` - ${insiderTitle}` : ''}${isOfficer ? ' (Officer)' : ''}${isDirector ? ' (Director)' : ''}
Filed: ${filing.filed_at}

Transactions:
${transactionDetails}

Net Activity: ${totalBuys > totalSells ? `$${(totalBuys - totalSells).toLocaleString()} net buying` : totalSells > totalBuys ? `$${(totalSells - totalBuys).toLocaleString()} net selling` : 'Neutral'}

Write a 2-3 sentence summary that:
1. States the key action (buy/sell/grant) and approximate value
2. Notes if this is significant (large amount, C-suite executive, pattern)
3. Provides brief context if relevant (e.g., "follows recent earnings beat")

Be factual and concise. Do not provide investment advice.`

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.3,
      },
    })

    const response = result.response
    return response.text() || null
  } catch (error) {
    console.error('Error generating summary:', error)
    return null
  }
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
