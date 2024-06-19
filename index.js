import { promises as fspromise } from 'fs'
import fs from 'fs'
import axios from 'axios'
import unzipper from 'unzipper'
import path from 'path'

let count = 0;
let data = [];

const getFormat = (gender) => {
  switch(gender) {
    case 'F': return 'female'
    case 'M': return 'male'
    default: return null
  }
}

let errors = 0;

const upload = async (content) => {
  const { data } = await axios.post('http://localhost:8080/rpc', {
    method: 'hl7v2.core/parse',
    params: { message: content }
  });
  
  const patient = data.result.parsed.patient_group.patient
  
  // console.dir(patient, { depth: 5 })
  
  const phone = (patient.telecom || []).find(i => i.system === 'phone')?.value || null
  const city = patient.address?.[0]?.city || null
  const pid = patient.identifier?.find(i => i.system === 'HL7.PID')?.value || null
  const ssn = patient.identifier?.find(i => i.system === 'ssn')?.value || null
  const first_name = patient.name?.[0]?.given?.[0] || null
  const last_name =  patient.name?.[0]?.family || null
  const birth_date = patient.birthDate || null
  const gender = getFormat(patient.gender)

  try {
    // console.log(content)
    

    await axios.post('http://jupyter-service.aidbox-dev.svc.cluster.local/patient', {
      pid, ssn, phone,
      first_name, last_name,
      birth_date, gender, city,
      telecom_json: patient.telecom || [],
      identifier_json: patient.identifier || [],
      name_json: patient.name ||  [],
      address_json: patient.address || []
    });

    count++
  } catch (error) {
    console.error({
      pid, ssn, phone,
      first_name, last_name,
      birth_date, gender, city,
      telecom_json: patient.telecom || [],
      identifier_json: patient.identifier || [],
      name_json: patient.name ||  [],
      address_json: patient.address || []
    })
    errors = errors + 1;
  }

  if (count % 1000 == 0) {
    console.log('uploaded: ', count);
  }
}

const loadFile = async (file) => {
  data = []
  // console.log(file)

  return new Promise((res) => {
    fs.createReadStream(file)
    .pipe(unzipper.Parse())
    .on('entry', async entry => {
      const fileName = entry.path
      const type = entry.type
  
      if (type === 'File') {
        let content = ''
        
        entry.on('data', chunk => { content += chunk.toString() })
        entry.on('end', async () => { data.push(content) })
      } else {
        entry.autodrain()
      }
    })
    .on('error', err => {
      console.error('Error:', err)
    })
    .on('close', async () => {
      console.log('Extraction complete', data.length)
  
      for (let item of data) {
        await upload(item);
      }
  
      console.log("done")
      res()
    })
  })  
} 

const getFiles = async () => {
  return new Promise(async (res) => {
    const strings = []

    const files = await fspromise.readdir('/home/aidbox/temp');
    
    for (const file of files) {
        const filePath = path.join('/home/aidbox/temp', file);
        const stats = await fspromise.stat(filePath);
        if (stats.isFile()) {
          strings.push(filePath)
        }
    }

    res(strings)
  })
}

async function isValidZip(filePath) {
  return new Promise((resolve, reject) => {
      fs.open(filePath, 'r', (err, fd) => {
          if (err) {
              return reject(err);
          }
          const buffer = Buffer.alloc(4);
          fs.read(fd, buffer, 0, 4, 0, (err) => {
              fs.close(fd, () => {
                  if (err) { return reject(err) }
                  const signature = buffer.toString('hex');
                  resolve(signature === '504b0304');
              });
          });
      });
  });
}

const loadFiles = async () => {
  const result = await getFiles()

  for (let item of result) {
    console.log(item)
    try {
      // await loadFile(item);
      let res = await isValidZip(item);
      console.log(res)
    } catch(error) {
      console.log(error)
    }
  }
}

loadFiles()