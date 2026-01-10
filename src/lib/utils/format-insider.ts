import { companyMatcher } from '@/lib/entities/company-matcher'
import { compareCiks } from '@/lib/validators/filing-schemas'

export interface InsiderDisplayContext {
  insiderName: string
  insiderTitle: string | null
  insiderCik: string
  companyCik: string
  companyName: string
  ticker: string
  isOfficer: boolean
  isDirector: boolean
  isTenPercentOwner: boolean
}

export interface FormattedInsiderDisplay {
  headline: string
  attribution: string
  shortAttribution: string
  isVerified: boolean
  warningMessage: string | null
}

export function formatInsiderRelationship(ctx: InsiderDisplayContext): FormattedInsiderDisplay {
  const knownInsider = companyMatcher.getKnownInsiderCompany(ctx.insiderName)

  if (knownInsider && !compareCiks(knownInsider.companyCik, ctx.companyCik)) {
    return {
      headline: `${ctx.insiderName} (10% Owner)`,
      attribution: `10% owner of ${ctx.ticker}`,
      shortAttribution: '10% Owner',
      isVerified: false,
      warningMessage: `Note: ${ctx.insiderName} is known as an executive of ${knownInsider.companyName}. Their title does not apply to ${ctx.companyName}.`,
    }
  }

  if (ctx.isOfficer && ctx.insiderTitle) {
    return {
      headline: `${ctx.insiderName}, ${ctx.companyName} ${ctx.insiderTitle}`,
      attribution: `${ctx.insiderTitle} of ${ctx.companyName}`,
      shortAttribution: ctx.insiderTitle,
      isVerified: true,
      warningMessage: null,
    }
  }

  if (ctx.isDirector) {
    const directorTitle = ctx.insiderTitle || 'Director'
    return {
      headline: `${ctx.insiderName}, ${ctx.companyName} ${directorTitle}`,
      attribution: `${directorTitle} of ${ctx.companyName}`,
      shortAttribution: directorTitle,
      isVerified: true,
      warningMessage: null,
    }
  }

  if (ctx.isTenPercentOwner) {
    return {
      headline: `${ctx.insiderName} (10% Owner)`,
      attribution: `10% owner of ${ctx.ticker}`,
      shortAttribution: '10% Owner',
      isVerified: true,
      warningMessage: null,
    }
  }

  return {
    headline: ctx.insiderName,
    attribution: `Reporting person for ${ctx.ticker}`,
    shortAttribution: 'Insider',
    isVerified: false,
    warningMessage: null,
  }
}

export function formatInsiderForEmail(ctx: InsiderDisplayContext): {
  displayName: string
  roleDescription: string
  companyContext: string
} {
  const formatted = formatInsiderRelationship(ctx)

  return {
    displayName: ctx.insiderName,
    roleDescription: formatted.shortAttribution,
    companyContext: ctx.isOfficer || ctx.isDirector ? `at ${ctx.companyName}` : `of ${ctx.ticker}`,
  }
}

export function formatInsiderForAI(ctx: InsiderDisplayContext): string {
  const formatted = formatInsiderRelationship(ctx)

  const lines = [
    `Insider Name: ${ctx.insiderName}`,
    `Company: ${ctx.companyName} (${ctx.ticker})`,
    `Role at ${ctx.companyName}: ${formatted.shortAttribution}`,
  ]

  if (ctx.isOfficer) {
    lines.push(`Relationship: Officer of ${ctx.companyName}`)
  } else if (ctx.isDirector) {
    lines.push(`Relationship: Director of ${ctx.companyName}`)
  } else if (ctx.isTenPercentOwner) {
    lines.push(`Relationship: 10% Owner of ${ctx.ticker} shares`)
  }

  if (formatted.warningMessage) {
    lines.push(`IMPORTANT: ${formatted.warningMessage}`)
  }

  return lines.join('\n')
}

export function formatClusterInsiders(
  insiders: InsiderDisplayContext[],
  _ticker: string,
  companyName: string
): {
  validCluster: boolean
  clusterDescription: string
  insiderList: string[]
  warnings: string[]
} {
  const warnings: string[] = []
  const validInsiders: InsiderDisplayContext[] = []
  const invalidInsiders: InsiderDisplayContext[] = []

  for (const insider of insiders) {
    const knownInsider = companyMatcher.getKnownInsiderCompany(insider.insiderName)

    if (knownInsider && !compareCiks(knownInsider.companyCik, insider.companyCik)) {
      invalidInsiders.push(insider)
      warnings.push(
        `${insider.insiderName} is not an insider of ${companyName} - they are affiliated with ${knownInsider.companyName}`
      )
    } else if (insider.isOfficer || insider.isDirector) {
      validInsiders.push(insider)
    } else if (insider.isTenPercentOwner) {
      validInsiders.push(insider)
    }
  }

  if (validInsiders.length < 2) {
    return {
      validCluster: false,
      clusterDescription: `Insufficient verified insiders for ${companyName} cluster`,
      insiderList: [],
      warnings,
    }
  }

  const insiderList = validInsiders.map((i) => {
    const formatted = formatInsiderRelationship(i)
    return formatted.headline
  })

  const officerCount = validInsiders.filter((i) => i.isOfficer).length
  const directorCount = validInsiders.filter((i) => i.isDirector).length

  let clusterDescription = `${validInsiders.length} ${companyName} insiders`
  if (officerCount > 0 && directorCount > 0) {
    clusterDescription += ` (${officerCount} officers, ${directorCount} directors)`
  } else if (officerCount > 0) {
    clusterDescription += ` (${officerCount} officers)`
  } else if (directorCount > 0) {
    clusterDescription += ` (${directorCount} directors)`
  }

  return {
    validCluster: true,
    clusterDescription,
    insiderList,
    warnings,
  }
}

export function validateInsiderTitleContext(
  insiderName: string,
  insiderTitle: string | null,
  _transactionTicker: string,
  transactionCompanyName: string,
  transactionCompanyCik: string
): {
  titleValid: boolean
  correctedTitle: string | null
  explanation: string
} {
  if (!insiderTitle) {
    return {
      titleValid: true,
      correctedTitle: null,
      explanation: 'No title provided',
    }
  }

  const knownInsider = companyMatcher.getKnownInsiderCompany(insiderName)

  if (!knownInsider) {
    return {
      titleValid: true,
      correctedTitle: insiderTitle,
      explanation: `Title "${insiderTitle}" is assumed valid for ${transactionCompanyName}`,
    }
  }

  if (compareCiks(knownInsider.companyCik, transactionCompanyCik)) {
    return {
      titleValid: true,
      correctedTitle: insiderTitle,
      explanation: `${insiderName} is confirmed as ${insiderTitle} of ${transactionCompanyName}`,
    }
  }

  return {
    titleValid: false,
    correctedTitle: null,
    explanation: `${insiderName}'s title "${insiderTitle}" is for ${knownInsider.companyName}, not ${transactionCompanyName}. This appears to be a 10% owner transaction.`,
  }
}
