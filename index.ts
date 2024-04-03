import { Client, HTTPError } from '@aidbox/sdk-r4'
import express from 'express'

import { PatientGroup, mapPatient } from './src/patient-group-mapping'

const app = express()

app.use(express.text())

const aidbox = new Client('<AIDBOX_URL>', {
  auth: {
    method: 'basic',
    credentials: { username: '<CLIENT_ID>', password: '<CLIENT_SECRET>' }
  }
})

const http = aidbox.HTTPClient()

interface Hl7v2Message {
  result: {
    parsed: {
      patient_group: PatientGroup,
      message: {
        datetime: string,
        id: string,
        type: { code: string, event: string, structure: string}
      }
    }
    errors: Array<string>
  }
}

app.post('/HL7v2/MESSAGE', async (req, res) => {
  const { response: { data } } = await http.post<Hl7v2Message>('rpc', {
    json: { method: 'hl7v2.core/parse', params: { message: req.body } }
  })

  const { result: { parsed: { patient_group } } } = data

  if (!patient_group.patient) return
  if (!patient_group.visit) return

  const patient = mapPatient(patient_group.patient)

  // console.dir(message, { depth: 5 })
  // console.dir(patient_group, { depth: 5 })

  try {
    await aidbox.resource.create('Patient', patient)
    res.send('OK!')
  } catch (error: unknown) {
    if (error instanceof HTTPError) {
      const exception = await error.response.json()
      console.dir(exception, { depth: 5 })
    }
  }
})

app.listen(3000)
