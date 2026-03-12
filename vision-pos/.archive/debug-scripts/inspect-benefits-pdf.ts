import * as fs from 'fs'
import * as path from 'path'
import pdfParse from 'pdf-parse'

async function main() {
  const docsDir = '/Users/cmac/let/vision-pos/test-documents/eyemed-only/'
  const files = fs.readdirSync(docsDir)
    .filter(f => f.endsWith('.pdf') && (f.includes('Benefits') || f.includes('eyemed')))
    .sort()

  // Inspect first 3 benefit documents
  for (const file of files.slice(0, 3)) {
    const filePath = path.join(docsDir, file)
    try {
      const dataBuffer = fs.readFileSync(filePath)
      const data = await pdfParse(dataBuffer)

      console.log('\n' + '='.repeat(80))
      console.log(`FILE: ${file}`)
      console.log('='.repeat(80))
      console.log(data.text.substring(0, 2500))
      console.log('\n--- SNIP ---\n')
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : err}`)
    }
  }
}

main().catch(console.error)
