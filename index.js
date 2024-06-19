import fs from 'fs'
import axios from 'axios'
import unzipper from 'unzipper'

let count = 0;

// CREATE TABLE example (
//   pid string NULL,
//   ssn string NULL,
//   city string NULL,
//   first_name string NULL,
//   last_name string NULL,
//   birth_date string NULL,
//   gender string NULL,
//   telecom_json JSON,
//   identifier_json JSON,
//   name_json JSON,
//   address_json JSON
// );

const getFormat = (gender) => {
  switch(gender) {
    case 'F': return 'female'
    case 'M': return 'male'
    default: return null
  }
}

fs.createReadStream('/home/aidbox/temp/message export.zip.001')
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
          console.log(content)
          const { data } = await axios.post('http://localhost:8080/rpc', {
            method: 'hl7v2.core/parse',
            params: { message: content }
          });
          
          const patient = data.result.parsed.patient_group.patient
          
          console.dir(patient, { depth: 5 })
          
          const phone = patient.telecom.find(telecom = telecom.system === 'phone')?.value || null
          const city = patient.address?.[0]?.city || null
          const pid = patient.identifier.find(i => i.system === 'HL7.PID')?.value || null
          const ssn = patient.identifier.find(i => i.system === 'ssn')?.value || null
          const first_name = patient.name?.[0]?.given?.[0] || null
          const last_name =  patient.name?.[0]?.family || null
          const birth_date = patient.birthDate || null
          const gender = getFormat(patient.gender)

          await axios.post('http://jupyter-service.aidbox-dev.svc.cluster.local/patient', {
            pid, ssn, phone,
            first_name, last_name,
            birth_date, gender, city,
            telecom_json: patient.telecom || [],
            identifier_json: patient.identifier || [],
            name_json: patient.name ||  [],
            address_json: patient.address || []
          });
        } catch (error) {
          console.error(`Error for ${fileName}:`, error)
          entry.autodrain()
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
