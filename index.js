import fs from 'fs'
import axios from 'axios'
import unzipper from 'unzipper'

let count = 0;

fs.createReadStream('/home/aidbox/temp/temp/message export.zip.001')
  .pipe(unzipper.Parse())
  .on('entry', async entry => {
    if (count >= 4) {
      entry.autodrain()
      return;
    }

    const fileName = entry.path
    const type = entry.type

    if (type === 'File') {
      let content = ''
      
      entry.on('data', chunk => { content += chunk.toString() })
      entry.on('end', async () => {

        try {
          const { data } = await axios.post('http://localhost:8080/rpc', {
            method: 'hl7v2.core/parse',
            params: { message: content }
          });
          console.log(data.result)
        } catch (error) {
          console.error(`Error for ${fileName}:`, error)
        }

        count++
      })
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
