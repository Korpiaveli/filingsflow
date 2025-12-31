import 'dotenv/config'
import { Client, GatewayIntentBits, Collection, Events } from 'discord.js'
import { readdirSync } from 'fs'
import { join } from 'path'
import type { Command } from './lib/types'

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
})

client.commands = new Collection<string, Command>()

async function loadCommands() {
  const commandsPath = join(__dirname, 'commands')
  const commandFiles = readdirSync(commandsPath).filter(
    (file) => file.endsWith('.ts') || file.endsWith('.js')
  )

  for (const file of commandFiles) {
    const filePath = join(commandsPath, file)
    const command = await import(filePath)

    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command)
      console.log(`Loaded command: ${command.data.name}`)
    } else {
      console.warn(`Command at ${filePath} missing required properties`)
    }
  }
}

async function loadEvents() {
  const eventsPath = join(__dirname, 'events')
  const eventFiles = readdirSync(eventsPath).filter(
    (file) => file.endsWith('.ts') || file.endsWith('.js')
  )

  for (const file of eventFiles) {
    const filePath = join(eventsPath, file)
    const event = await import(filePath)

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args))
    } else {
      client.on(event.name, (...args) => event.execute(...args))
    }
    console.log(`Loaded event: ${event.name}`)
  }
}

async function main() {
  const token = process.env.DISCORD_BOT_TOKEN

  if (!token) {
    console.error('DISCORD_BOT_TOKEN is required')
    process.exit(1)
  }

  await loadCommands()
  await loadEvents()

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return

    const command = client.commands.get(interaction.commandName)

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`)
      return
    }

    try {
      await command.execute(interaction)
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}:`, error)

      const reply = {
        content: 'There was an error executing this command.',
        ephemeral: true,
      }

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply)
      } else {
        await interaction.reply(reply)
      }
    }
  })

  await client.login(token)
}

main().catch(console.error)

declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>
  }
}
