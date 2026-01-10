import { Resend } from 'resend'
import { formatInsiderForEmail, type InsiderDisplayContext } from '@/lib/utils/format-insider'

let resendInstance: Resend | null = null

const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev'

function getResend(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set')
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY)
  }
  return resendInstance
}

export interface InsiderAlertData {
  ticker: string
  companyName: string
  insiderName: string
  insiderTitle: string
  insiderCik?: string
  companyCik?: string
  isOfficer?: boolean
  isDirector?: boolean
  isTenPercentOwner?: boolean
  transactionType: 'buy' | 'sell' | 'grant'
  shares: number
  totalValue: number
  transactionDate: string
  filingUrl: string
  aiSummary?: string
  is10b51Plan?: boolean
}

export interface Filing13FAlertData {
  ticker: string
  fundName: string
  shares: number
  valueUsd: number
  reportDate: string
  changeType: 'new' | 'increased' | 'decreased' | 'sold'
  previousShares?: number
}

export async function sendInsiderAlert(
  to: string,
  data: InsiderAlertData
): Promise<boolean> {
  const resend = getResend()
  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(data.totalValue)

  const formattedShares = new Intl.NumberFormat('en-US').format(data.shares)

  const insiderContext: InsiderDisplayContext = {
    insiderName: data.insiderName,
    insiderTitle: data.insiderTitle || null,
    insiderCik: data.insiderCik || '',
    companyCik: data.companyCik || '',
    companyName: data.companyName,
    ticker: data.ticker,
    isOfficer: data.isOfficer || false,
    isDirector: data.isDirector || false,
    isTenPercentOwner: data.isTenPercentOwner || false,
  }

  const formattedInsider = formatInsiderForEmail(insiderContext)

  const subject = `${data.transactionType === 'buy' ? '🟢' : data.transactionType === 'sell' ? '🔴' : '🟡'} ${data.ticker}: ${data.insiderName} ${data.transactionType} ${formattedValue}`

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a; margin-bottom: 16px;">
        Insider ${data.transactionType.charAt(0).toUpperCase() + data.transactionType.slice(1)} Alert
      </h2>

      <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
        <p style="margin: 0 0 8px 0; font-size: 24px; font-weight: bold; color: #1a1a1a;">
          ${data.ticker} - ${data.companyName}
        </p>
        <p style="margin: 0; color: #666;">
          ${formattedInsider.displayName}, ${formattedInsider.roleDescription} ${formattedInsider.companyContext}
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">Transaction</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 500; text-transform: capitalize;">
            ${data.transactionType}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">Trade Type</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 500;">
            ${data.is10b51Plan ? '<span style="color: #666;">📋 Pre-planned (10b5-1)</span>' : '<span style="color: #0ea5e9;">⚡ Discretionary</span>'}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">Shares</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 500;">${formattedShares}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">Value</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 500;">${formattedValue}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">Date</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 500;">${data.transactionDate}</td>
        </tr>
      </table>

      ${data.aiSummary ? `
        <div style="background: #e8f4f8; border-left: 4px solid #0ea5e9; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #666; text-transform: uppercase;">AI Summary</p>
          <p style="margin: 0; color: #1a1a1a;">${data.aiSummary}</p>
        </div>
      ` : ''}

      <a href="${data.filingUrl}" style="display: inline-block; background: #1a1a1a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
        View SEC Filing
      </a>

      <p style="margin-top: 24px; font-size: 12px; color: #999;">
        You're receiving this because ${data.ticker} is on your FilingsFlow watchlist.
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color: #666;">Manage preferences</a>
      </p>
    </div>
  `

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    })
    return true
  } catch (error) {
    console.error('Failed to send insider alert email:', error)
    return false
  }
}

export async function send13FAlert(
  to: string,
  data: Filing13FAlertData
): Promise<boolean> {
  const resend = getResend()
  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(data.valueUsd)

  const formattedShares = new Intl.NumberFormat('en-US').format(data.shares)

  const changeEmoji = {
    new: '🆕',
    increased: '📈',
    decreased: '📉',
    sold: '🔴',
  }[data.changeType]

  const subject = `${changeEmoji} ${data.ticker}: ${data.fundName} ${data.changeType} position`

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a; margin-bottom: 16px;">
        13F Holdings Update
      </h2>

      <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
        <p style="margin: 0 0 8px 0; font-size: 24px; font-weight: bold; color: #1a1a1a;">
          ${data.ticker}
        </p>
        <p style="margin: 0; color: #666;">
          ${data.fundName}
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">Change</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 500; text-transform: capitalize;">
            ${data.changeType} position
          </td>
        </tr>
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">Current Shares</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 500;">${formattedShares}</td>
        </tr>
        ${data.previousShares !== undefined ? `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">Previous Shares</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 500;">
              ${new Intl.NumberFormat('en-US').format(data.previousShares)}
            </td>
          </tr>
        ` : ''}
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">Value</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 500;">${formattedValue}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee; color: #666;">Report Date</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 500;">${data.reportDate}</td>
        </tr>
      </table>

      <a href="${process.env.NEXT_PUBLIC_APP_URL}/funds" style="display: inline-block; background: #1a1a1a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
        View All Holdings
      </a>

      <p style="margin-top: 24px; font-size: 12px; color: #999;">
        You're receiving this because ${data.ticker} is on your FilingsFlow watchlist.
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color: #666;">Manage preferences</a>
      </p>
    </div>
  `

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    })
    return true
  } catch (error) {
    console.error('Failed to send 13F alert email:', error)
    return false
  }
}

export async function sendDailyDigest(
  to: string,
  data: {
    insiderAlerts: InsiderAlertData[]
    holdings13F: Filing13FAlertData[]
    date: string
  }
): Promise<boolean> {
  if (data.insiderAlerts.length === 0 && data.holdings13F.length === 0) {
    return true
  }

  const resend = getResend()

  const insiderRows = data.insiderAlerts.map(alert => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${alert.ticker}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${alert.insiderName}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-transform: capitalize;">${alert.transactionType}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">
        ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(alert.totalValue)}
      </td>
    </tr>
  `).join('')

  const holdingsRows = data.holdings13F.map(h => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${h.ticker}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${h.fundName}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-transform: capitalize;">${h.changeType}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">
        ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(h.valueUsd)}
      </td>
    </tr>
  `).join('')

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a; margin-bottom: 16px;">
        Daily Watchlist Digest - ${data.date}
      </h2>

      ${data.insiderAlerts.length > 0 ? `
        <h3 style="color: #1a1a1a; margin: 24px 0 12px;">Insider Transactions (${data.insiderAlerts.length})</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 8px; text-align: left;">Ticker</th>
              <th style="padding: 8px; text-align: left;">Insider</th>
              <th style="padding: 8px; text-align: left;">Type</th>
              <th style="padding: 8px; text-align: left;">Value</th>
            </tr>
          </thead>
          <tbody>${insiderRows}</tbody>
        </table>
      ` : ''}

      ${data.holdings13F.length > 0 ? `
        <h3 style="color: #1a1a1a; margin: 24px 0 12px;">13F Updates (${data.holdings13F.length})</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 8px; text-align: left;">Ticker</th>
              <th style="padding: 8px; text-align: left;">Fund</th>
              <th style="padding: 8px; text-align: left;">Change</th>
              <th style="padding: 8px; text-align: left;">Value</th>
            </tr>
          </thead>
          <tbody>${holdingsRows}</tbody>
        </table>
      ` : ''}

      <div style="margin-top: 24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/filings" style="display: inline-block; background: #1a1a1a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          View All Filings
        </a>
      </div>

      <p style="margin-top: 24px; font-size: 12px; color: #999;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color: #666;">Manage notification preferences</a>
      </p>
    </div>
  `

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `FilingsFlow Daily Digest - ${data.insiderAlerts.length + data.holdings13F.length} updates`,
      html,
    })
    return true
  } catch (error) {
    console.error('Failed to send daily digest:', error)
    return false
  }
}
