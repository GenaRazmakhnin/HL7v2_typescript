import { Address } from '@aidbox/sdk-r4/types/hl7-fhir-r4-core/Address'
import { Coding } from '@aidbox/sdk-r4/types/hl7-fhir-r4-core/Coding'
import { Encounter } from '@aidbox/sdk-r4/types/hl7-fhir-r4-core/Encounter'
import { HumanName } from '@aidbox/sdk-r4/types/hl7-fhir-r4-core/HumanName'
import { Identifier } from '@aidbox/sdk-r4/types/hl7-fhir-r4-core/Identifier'
import { Patient, PatientGender } from '@aidbox/sdk-r4/types/hl7-fhir-r4-core/Patient'

interface ParsedPatient {
  identifier?: Array<Identifier>,
  name?: Array<HumanName>
  address?: Array<Address>
  gender?: string
  race: Array<Coding>,
  ethnicity: Array<Coding>,
}

interface ParsedEncounter {
  period: { start?: string, end?: string }
}

export interface PatientGroup {
  patient?: ParsedPatient,
  visit?: ParsedEncounter
}

const mapGender = (gender: string | undefined): `${PatientGender}` => {
  switch (gender) {
    case 'F': return 'female'
    case 'M': return 'male'
    default : return 'unknown'
  }
}

export const mapPatient = (patient: ParsedPatient): Patient => {
  const { identifier, address, name, gender } = patient //, race, ethnicity

  return {
    identifier,
    address,
    name,
    gender: mapGender(gender),
    resourceType: 'Patient'
  }
}

export const mapEncounter = (encounter: ParsedEncounter): Encounter => {
  return {
    period: encounter.period,
    status: 'finished',
    class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'IMP' },
    resourceType: 'Encounter'
  }
}
