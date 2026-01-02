const SEC_BASE_URL = 'https://www.sec.gov'
const USER_AGENT = 'FilingsFlow/1.0 (test@example.com)'

async function testSECConnection() {
  console.log('Testing SEC EDGAR API connection...\n')

  try {
    const url = `${SEC_BASE_URL}/cgi-bin/browse-edgar?action=getcurrent&type=4&owner=include&count=5&output=atom`

    console.log('Fetching recent Form 4 filings...')
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/atom+xml',
      },
    })

    if (!response.ok) {
      throw new Error(`SEC API error: ${response.status} ${response.statusText}`)
    }

    const xml = await response.text()
    const entryCount = (xml.match(/<entry>/g) || []).length

    console.log(`Success! Found ${entryCount} recent Form 4 filings\n`)

    const titleMatches = xml.matchAll(/<title>([^<]+)<\/title>/g)
    let count = 0
    for (const match of titleMatches) {
      if (count > 0 && count <= 5) {
        console.log(`  - ${match[1]}`)
      }
      count++
    }

    console.log('\nSEC API connection verified!')
    return true
  } catch (error) {
    console.error('SEC API test failed:', error)
    return false
  }
}

async function testCompanyLookup() {
  console.log('\n\nTesting company lookup (Apple Inc)...')

  try {
    const url = 'https://data.sec.gov/submissions/CIK0000320193.json'
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    })

    if (!response.ok) {
      throw new Error(`Company lookup error: ${response.status}`)
    }

    const data = await response.json() as { name: string; tickers: string[] }
    console.log(`  Company: ${data.name}`)
    console.log(`  Ticker: ${data.tickers?.[0] || 'N/A'}`)
    console.log('\nCompany lookup verified!')
    return true
  } catch (error) {
    console.error('Company lookup failed:', error)
    return false
  }
}

async function main() {
  console.log('='.repeat(50))
  console.log('FilingsFlow SEC API Test')
  console.log('='.repeat(50))

  const feedOk = await testSECConnection()
  const lookupOk = await testCompanyLookup()

  console.log('\n' + '='.repeat(50))
  console.log('Results:')
  console.log(`  Atom Feed: ${feedOk ? 'PASS' : 'FAIL'}`)
  console.log(`  Company Lookup: ${lookupOk ? 'PASS' : 'FAIL'}`)
  console.log('='.repeat(50))

  process.exit(feedOk && lookupOk ? 0 : 1)
}

main()
