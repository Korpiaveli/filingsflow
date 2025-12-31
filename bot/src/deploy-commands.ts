import 'dotenv/config'
import { REST, Routes } from 'discord.js'
import { readdirSync } from 'fs'
import { join } from 'path'

const token = process.env.DISCORD_BOT_TOKEN!
const clientId = process.env.DISCORD_CLIENT_ID!

if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_CLIENT_ID) {
  console.error('Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID')
  process.exit(1)
}

async function deployCommands() {
  const commands = []
  const commandsPath = join(__dirname, 'commands')
  const commandFiles = readdirSync(commandsPath).filter(
    (file) => file.endsWith('.ts') || file.endsWith('.js')
  )

  for (const file of commandFiles) {
    const filePath = join(commandsPath, file)
    const command = await import(filePath)

    if ('data' in command) {
      commands.push(command.data.toJSON())
      console.log(`Loaded command: ${command.data.name}`)
    }
  }

  const rest = new REST().setToken(token)

  try {
    console.log(`Deploying ${commands.length} commands...`)

    const data = await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    })

    console.log(`Successfully deployed ${(data as unknown[]).length} commands!`)
  } catch (error) {
    console.error('Failed to deploy commands:', error)
    process.exit(1)
  }
}

deployCommands()
