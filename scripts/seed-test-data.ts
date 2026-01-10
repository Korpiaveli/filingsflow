import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const COMPANIES = {
  NVDA: { ticker: 'NVDA', company: 'NVIDIA Corporation', cik: '0001045810' },
  AAPL: { ticker: 'AAPL', company: 'Apple Inc.', cik: '0000320193' },
  MSFT: { ticker: 'MSFT', company: 'Microsoft Corporation', cik: '0000789019' },
  GOOGL: { ticker: 'GOOGL', company: 'Alphabet Inc.', cik: '0001652044' },
  TSLA: { ticker: 'TSLA', company: 'Tesla, Inc.', cik: '0001318605' },
  AMZN: { ticker: 'AMZN', company: 'Amazon.com, Inc.', cik: '0001018724' },
  META: { ticker: 'META', company: 'Meta Platforms, Inc.', cik: '0001326801' },
  JPM: { ticker: 'JPM', company: 'JPMorgan Chase & Co.', cik: '0000019617' },
  V: { ticker: 'V', company: 'Visa Inc.', cik: '0001403161' },
  XOM: { ticker: 'XOM', company: 'Exxon Mobil Corporation', cik: '0000034088' },
} as const

const TICKERS = Object.values(COMPANIES)

interface InsiderData {
  name: string
  title: string
  cik: string
  companyTicker: keyof typeof COMPANIES
  isOfficer: boolean
  isDirector: boolean
}

const INSIDERS: InsiderData[] = [
  { name: 'Jensen Huang', title: 'CEO', cik: '0001548760', companyTicker: 'NVDA', isOfficer: true, isDirector: true },
  { name: 'Colette Kress', title: 'CFO', cik: '0001567890', companyTicker: 'NVDA', isOfficer: true, isDirector: false },
  { name: 'Tim Cook', title: 'CEO', cik: '0001214156', companyTicker: 'AAPL', isOfficer: true, isDirector: true },
  { name: 'Luca Maestri', title: 'CFO', cik: '0001234567', companyTicker: 'AAPL', isOfficer: true, isDirector: false },
  { name: 'Satya Nadella', title: 'CEO', cik: '0001513142', companyTicker: 'MSFT', isOfficer: true, isDirector: true },
  { name: 'Amy Hood', title: 'CFO', cik: '0001345678', companyTicker: 'MSFT', isOfficer: true, isDirector: false },
  { name: 'Sundar Pichai', title: 'CEO', cik: '0001560261', companyTicker: 'GOOGL', isOfficer: true, isDirector: true },
  { name: 'Ruth Porat', title: 'CFO', cik: '0001456789', companyTicker: 'GOOGL', isOfficer: true, isDirector: false },
  { name: 'Elon Musk', title: 'CEO', cik: '0001494730', companyTicker: 'TSLA', isOfficer: true, isDirector: true },
  { name: 'Vaibhav Taneja', title: 'CFO', cik: '0001789012', companyTicker: 'TSLA', isOfficer: true, isDirector: false },
  { name: 'Andy Jassy', title: 'CEO', cik: '0001323468', companyTicker: 'AMZN', isOfficer: true, isDirector: true },
  { name: 'Brian Olsavsky', title: 'CFO', cik: '0001890123', companyTicker: 'AMZN', isOfficer: true, isDirector: false },
  { name: 'Mark Zuckerberg', title: 'CEO', cik: '0001548760', companyTicker: 'META', isOfficer: true, isDirector: true },
  { name: 'Susan Li', title: 'CFO', cik: '0001901234', companyTicker: 'META', isOfficer: true, isDirector: false },
  { name: 'Jamie Dimon', title: 'CEO', cik: '0001159508', companyTicker: 'JPM', isOfficer: true, isDirector: true },
  { name: 'Jeremy Barnum', title: 'CFO', cik: '0001912345', companyTicker: 'JPM', isOfficer: true, isDirector: false },
  { name: 'Ryan McInerney', title: 'CEO', cik: '0001445389', companyTicker: 'V', isOfficer: true, isDirector: true },
  { name: 'Chris Suh', title: 'CFO', cik: '0001923456', companyTicker: 'V', isOfficer: true, isDirector: false },
  { name: 'Darren Woods', title: 'CEO', cik: '0001657045', companyTicker: 'XOM', isOfficer: true, isDirector: true },
  { name: 'Kathy Mikells', title: 'CFO', cik: '0001934567', companyTicker: 'XOM', isOfficer: true, isDirector: false },
]

function getInsidersForCompany(ticker: keyof typeof COMPANIES): InsiderData[] {
  return INSIDERS.filter(i => i.companyTicker === ticker)
}

const CONGRESS_MEMBERS = [
  { name: 'Nancy Pelosi', party: 'D', chamber: 'house', state: 'CA', district: '11' },
  { name: 'Dan Crenshaw', party: 'R', chamber: 'house', state: 'TX', district: '2' },
  { name: 'Tommy Tuberville', party: 'R', chamber: 'senate', state: 'AL' },
  { name: 'Mark Kelly', party: 'D', chamber: 'senate', state: 'AZ' },
  { name: 'Michael McCaul', party: 'R', chamber: 'house', state: 'TX', district: '10' },
]

const FUNDS = [
  { cik: '0001067983', name: 'Berkshire Hathaway Inc' },
  { cik: '0001350694', name: 'Citadel Advisors LLC' },
  { cik: '0001336528', name: 'Bridgewater Associates LP' },
  { cik: '0001061768', name: 'Vanguard Group Inc' },
  { cik: '0001037389', name: 'BlackRock Inc' },
]

function randomDate(daysAgo: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo))
  return date
}

function randomValue(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

async function seedFilings() {
  console.log('Seeding filings...')

  const filings = []
  for (let i = 0; i < 50; i++) {
    const ticker = randomElement(TICKERS)
    const formType = randomElement(['3', '4', '5', '13F-HR'])
    const filedAt = randomDate(30)

    filings.push({
      cik: `000${randomValue(1000000, 9999999)}`,
      accession_number: `0001234567-${String(filedAt.getFullYear()).slice(2)}-${String(i).padStart(6, '0')}`,
      form_type: formType,
      filed_at: filedAt.toISOString(),
      accepted_at: filedAt.toISOString(),
      ticker: ticker.ticker,
      company_name: ticker.company,
      filer_name: randomElement(INSIDERS).name,
    })
  }

  const { data, error } = await supabase
    .from('filings')
    .upsert(filings, { onConflict: 'accession_number' })
    .select('id')

  if (error) {
    console.error('Error seeding filings:', error)
    return []
  }

  console.log(`Seeded ${data?.length || 0} filings`)
  return data || []
}

async function seedInsiderTransactions(filingIds: { id: string }[]) {
  console.log('Seeding insider transactions...')

  if (filingIds.length === 0) {
    console.log('No filings to attach transactions to')
    return
  }

  const transactions = []

  for (let i = 0; i < 100; i++) {
    const insider = randomElement(INSIDERS)
    const company = COMPANIES[insider.companyTicker]
    const isBuy = Math.random() > 0.4
    const shares = randomValue(100, 100000)
    const price = randomValue(50, 500) + Math.random()
    const transactionDate = randomDate(14)

    transactions.push({
      filing_id: randomElement(filingIds).id,
      ticker: company.ticker,
      company_cik: company.cik,
      company_name: company.company,
      insider_cik: insider.cik,
      insider_name: insider.name,
      insider_title: insider.title,
      is_director: insider.isDirector,
      is_officer: insider.isOfficer,
      is_ten_percent_owner: false,
      transaction_type: isBuy ? 'P' : 'S',
      transaction_date: transactionDate.toISOString().split('T')[0],
      shares: shares,
      price_per_share: Math.round(price * 100) / 100,
      total_value: Math.round(shares * price * 100) / 100,
      shares_owned_after: randomValue(10000, 1000000),
      direct_or_indirect: 'D',
      is_derivative: false,
    })
  }

  const nvdaInsiders = getInsidersForCompany('NVDA')
  const clusterDate = new Date()
  clusterDate.setDate(clusterDate.getDate() - 2)

  for (const insider of nvdaInsiders) {
    const shares = randomValue(5000, 50000)
    const price = 142.50

    transactions.push({
      filing_id: randomElement(filingIds).id,
      ticker: COMPANIES.NVDA.ticker,
      company_cik: COMPANIES.NVDA.cik,
      company_name: COMPANIES.NVDA.company,
      insider_cik: insider.cik,
      insider_name: insider.name,
      insider_title: insider.title,
      is_director: insider.isDirector,
      is_officer: insider.isOfficer,
      is_ten_percent_owner: false,
      transaction_type: 'P',
      transaction_date: clusterDate.toISOString().split('T')[0],
      shares: shares,
      price_per_share: price,
      total_value: shares * price,
      shares_owned_after: randomValue(100000, 500000),
      direct_or_indirect: 'D',
      is_derivative: false,
    })
  }

  const googInsiders = getInsidersForCompany('GOOGL')
  const googClusterDate = new Date()
  googClusterDate.setDate(googClusterDate.getDate() - 3)

  for (const insider of googInsiders) {
    const shares = randomValue(2000, 20000)
    const price = 175.25

    transactions.push({
      filing_id: randomElement(filingIds).id,
      ticker: COMPANIES.GOOGL.ticker,
      company_cik: COMPANIES.GOOGL.cik,
      company_name: COMPANIES.GOOGL.company,
      insider_cik: insider.cik,
      insider_name: insider.name,
      insider_title: insider.title,
      is_director: insider.isDirector,
      is_officer: insider.isOfficer,
      is_ten_percent_owner: false,
      transaction_type: 'P',
      transaction_date: googClusterDate.toISOString().split('T')[0],
      shares: shares,
      price_per_share: price,
      total_value: shares * price,
      shares_owned_after: randomValue(50000, 200000),
      direct_or_indirect: 'D',
      is_derivative: false,
    })
  }

  const heroDate = new Date()
  heroDate.setDate(heroDate.getDate() - 1)
  const jensenHuang = INSIDERS.find(i => i.name === 'Jensen Huang')!
  transactions.push({
    filing_id: randomElement(filingIds).id,
    ticker: COMPANIES.NVDA.ticker,
    company_cik: COMPANIES.NVDA.cik,
    company_name: COMPANIES.NVDA.company,
    insider_cik: jensenHuang.cik,
    insider_name: jensenHuang.name,
    insider_title: jensenHuang.title,
    is_director: jensenHuang.isDirector,
    is_officer: jensenHuang.isOfficer,
    is_ten_percent_owner: false,
    transaction_type: 'P',
    transaction_date: heroDate.toISOString().split('T')[0],
    shares: 85000,
    price_per_share: 142.50,
    total_value: 12112500,
    shares_owned_after: 3500000,
    direct_or_indirect: 'D',
    is_derivative: false,
  })

  const { error } = await supabase.from('insider_transactions').insert(transactions)

  if (error) {
    console.error('Error seeding insider transactions:', error)
    return
  }

  console.log(`Seeded ${transactions.length} insider transactions`)
}

async function seedCongressionalTrades() {
  console.log('Seeding congressional transactions...')

  const transactions = []

  for (let i = 0; i < 30; i++) {
    const member = randomElement(CONGRESS_MEMBERS)
    const ticker = randomElement(TICKERS)
    const isPurchase = Math.random() > 0.4
    const amountRanges = [
      { range: '$1,001 - $15,000', low: 1001, high: 15000 },
      { range: '$15,001 - $50,000', low: 15001, high: 50000 },
      { range: '$50,001 - $100,000', low: 50001, high: 100000 },
      { range: '$100,001 - $250,000', low: 100001, high: 250000 },
      { range: '$250,001 - $500,000', low: 250001, high: 500000 },
      { range: '$500,001 - $1,000,000', low: 500001, high: 1000000 },
    ]
    const amount = randomElement(amountRanges)
    const disclosureDate = randomDate(30)
    const transactionDate = new Date(disclosureDate)
    transactionDate.setDate(transactionDate.getDate() - randomValue(1, 45))

    transactions.push({
      chamber: member.chamber,
      member_name: member.name,
      state: member.state,
      district: member.district || null,
      party: member.party,
      ticker: ticker.ticker,
      asset_description: ticker.company,
      transaction_type: isPurchase ? 'Purchase' : 'Sale (Full)',
      transaction_date: transactionDate.toISOString().split('T')[0],
      disclosure_date: disclosureDate.toISOString().split('T')[0],
      amount_range: amount.range,
      amount_low: amount.low,
      amount_high: amount.high,
      owner: 'Self',
    })
  }

  const { error } = await supabase
    .from('congressional_transactions')
    .upsert(transactions, {
      onConflict: 'chamber,member_name,disclosure_date,ticker,transaction_date,transaction_type,amount_range',
      ignoreDuplicates: true
    })

  if (error) {
    console.error('Error seeding congressional transactions:', error)
    return
  }

  console.log(`Seeded ${transactions.length} congressional transactions`)
}

async function seed13FHoldings(filingIds: { id: string }[]) {
  console.log('Seeding 13F holdings...')

  if (filingIds.length === 0) {
    console.log('No filings to attach holdings to')
    return
  }

  const holdings = []
  const reportDate = new Date()
  reportDate.setMonth(reportDate.getMonth() - 1)
  const quarterEnd = new Date(reportDate.getFullYear(), Math.floor(reportDate.getMonth() / 3) * 3, 1)
  quarterEnd.setMonth(quarterEnd.getMonth() + 3)
  quarterEnd.setDate(0)

  for (const fund of FUNDS) {
    for (const ticker of TICKERS.slice(0, 7)) {
      const shares = randomValue(100000, 10000000)
      const price = randomValue(50, 500)

      holdings.push({
        filing_id: randomElement(filingIds).id,
        fund_cik: fund.cik,
        fund_name: fund.name,
        report_date: quarterEnd.toISOString().split('T')[0],
        ticker: ticker.ticker,
        cusip: `${randomValue(100000000, 999999999)}`,
        issuer_name: ticker.company,
        title_of_class: 'COM',
        shares: shares,
        value_usd: shares * price,
        investment_discretion: 'SOLE',
        voting_authority_sole: shares,
        voting_authority_shared: 0,
        voting_authority_none: 0,
      })
    }
  }

  const { error } = await supabase.from('holdings_13f').insert(holdings)

  if (error) {
    console.error('Error seeding 13F holdings:', error)
    return
  }

  console.log(`Seeded ${holdings.length} 13F holdings`)
}

async function main() {
  console.log('Starting seed...\n')
  console.log(`Supabase URL: ${supabaseUrl}`)

  try {
    const filings = await seedFilings()
    await seedInsiderTransactions(filings)
    await seedCongressionalTrades()
    await seed13FHoldings(filings)

    console.log('\nSeed completed successfully!')
    console.log('\nTest the dashboard by running: npm run dev')
  } catch (error) {
    console.error('Seed failed:', error)
    process.exit(1)
  }
}

main()
