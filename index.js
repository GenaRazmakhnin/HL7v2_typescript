import fs from 'fs'

import unzipper from 'unzipper'

fs.createReadStream('/home/aidbox/temp/temp/message export.zip.001')
  .pipe(unzipper.Parse())
  .on('entry', entry => {
    const fileName = entry.path
    const type = entry.type
    const size = entry.vars.uncompressedSize

    console.log(`File: ${fileName}, Type: ${type}, Size: ${size}`)

    if (type === 'File') {
      let content = ''

      entry.on('data', chunk => { content += chunk.toString() })
      entry.on('end', () => { console.log(`Content of ${fileName}:`, content) })
    } else {
      entry.autodrain()
    }
  })
  .on('error', err => {
    console.error('Error:', err)
  })
  .on('close', () => {
    console.log('Extraction complete')
  })
