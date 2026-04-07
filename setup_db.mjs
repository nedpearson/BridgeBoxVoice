import fs from 'fs'
import pkg from 'pg'
const { Client } = pkg

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error("Missing DATABASE_URL")
  process.exit(1)
}

const client = new Client({ connectionString })

async function run() {
  await client.connect()
  console.log("Connected to Supabase PostgreSQL.")
  
  const files = [
    'DATABASE_PLATFORM.sql',
    'DATABASE_ENTERPRISE.sql',
    'DATABASE_ENHANCEMENT_STUDIO.sql'
  ]
  
  for (const file of files) {
    if (fs.existsSync(file)) {
      console.log(`Executing ${file}...`)
      try {
        const sql = fs.readFileSync(file, 'utf8')
        await client.query(sql)
        console.log(`✅ Success: ${file}`)
      } catch (err) {
        console.error(`❌ Error in ${file}:`, err.message)
      }
    }
  }
}

run().finally(() => client.end())
