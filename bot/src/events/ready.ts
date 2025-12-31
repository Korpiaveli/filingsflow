import { Events, Client } from 'discord.js'

export const name = Events.ClientReady
export const once = true

export function execute(client: Client<true>) {
  console.log(`Bot ready! Logged in as ${client.user.tag}`)
  console.log(`Serving ${client.guilds.cache.size} servers`)

  client.user.setActivity('SEC filings', { type: 3 })
}
