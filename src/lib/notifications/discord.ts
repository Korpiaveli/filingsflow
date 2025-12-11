import type { InsiderAlertData, Filing13FAlertData } from './email'

export async function sendDiscordInsiderAlert(
  webhookUrl: string,
  data: InsiderAlertData
): Promise<boolean> {
  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(data.totalValue)

  const formattedShares = new Intl.NumberFormat('en-US').format(data.shares)

  const color = data.transactionType === 'buy' ? 0x22c55e : data.transactionType === 'sell' ? 0xef4444 : 0xeab308

  const embed = {
    title: `${data.ticker}: Insider ${data.transactionType.charAt(0).toUpperCase() + data.transactionType.slice(1)}`,
    description: data.aiSummary || `${data.insiderName} ${data.transactionType} ${formattedShares} shares`,
    color,
    fields: [
      { name: 'Company', value: data.companyName, inline: true },
      { name: 'Insider', value: `${data.insiderName}\n${data.insiderTitle}`, inline: true },
      { name: 'Transaction', value: data.transactionType.toUpperCase(), inline: true },
      { name: 'Shares', value: formattedShares, inline: true },
      { name: 'Value', value: formattedValue, inline: true },
      { name: 'Date', value: data.transactionDate, inline: true },
    ],
    url: data.filingUrl,
    footer: { text: 'FilingsFlow' },
    timestamp: new Date().toISOString(),
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })

    if (!response.ok) {
      console.error('Discord webhook failed:', response.status, await response.text())
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to send Discord insider alert:', error)
    return false
  }
}

export async function sendDiscord13FAlert(
  webhookUrl: string,
  data: Filing13FAlertData
): Promise<boolean> {
  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(data.valueUsd)

  const formattedShares = new Intl.NumberFormat('en-US').format(data.shares)

  const colorMap = {
    new: 0x3b82f6,
    increased: 0x22c55e,
    decreased: 0xf97316,
    sold: 0xef4444,
  }

  const fields = [
    { name: 'Fund', value: data.fundName, inline: true },
    { name: 'Position Change', value: data.changeType.toUpperCase(), inline: true },
    { name: 'Current Shares', value: formattedShares, inline: true },
    { name: 'Value', value: formattedValue, inline: true },
    { name: 'Report Date', value: data.reportDate, inline: true },
  ]

  if (data.previousShares !== undefined) {
    fields.push({
      name: 'Previous Shares',
      value: new Intl.NumberFormat('en-US').format(data.previousShares),
      inline: true,
    })
  }

  const embed = {
    title: `${data.ticker}: 13F Holdings Update`,
    description: `${data.fundName} ${data.changeType} their position`,
    color: colorMap[data.changeType],
    fields,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/funds`,
    footer: { text: 'FilingsFlow' },
    timestamp: new Date().toISOString(),
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })

    if (!response.ok) {
      console.error('Discord webhook failed:', response.status, await response.text())
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to send Discord 13F alert:', error)
    return false
  }
}

export async function sendDiscordDM(
  userId: string,
  botToken: string,
  content: string
): Promise<boolean> {
  try {
    const dmChannelRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipient_id: userId }),
    })

    if (!dmChannelRes.ok) {
      console.error('Failed to create DM channel:', await dmChannelRes.text())
      return false
    }

    const dmChannel = await dmChannelRes.json()

    const messageRes = await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    })

    if (!messageRes.ok) {
      console.error('Failed to send DM:', await messageRes.text())
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to send Discord DM:', error)
    return false
  }
}
