import * as fs from 'fs'
import * as path from 'path'
import pdfParse from 'pdf-parse'

async function main() {
  const docsDir = '/Users/cmac/let/vision-pos/public/uploads/insurance-docs/'
  const files = fs.readdirSync(docsDir)
    .filter(f => f.includes('eyemed') || f.includes('Eyemed') || f.includes('EyeMed'))
    .sort()

  // Inspect first 3 documents
  for (const file of files.slice(0, 3)) {
    const filePath = path.join(docsDir, file)
    try {
      const dataBuffer = fs.readFileSync(filePath)
      const data = await pdfParse(dataBuffer)

      console.log('\n' + '='.repeat(80))
      console.log(`FILE: ${file}`)
      console.log('='.repeat(80))
      console.log(data.text.substring(0, 3000))
      console.log('\n--- END SNIPPET ---\n')
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : err}`)
    }
  }
}

main().catch(console.error)
