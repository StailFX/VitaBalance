export interface Vitamin {
  id: number
  name: string
  code: string
  description: string
  deficiency_symptoms: string
  excess_symptoms: string
  unit: string
  norm_male_min: number
  norm_male_max: number
  norm_female_min: number
  norm_female_max: number
}

export interface SymptomMapping {
  id: number
  symptom_text: string
  vitamin_id: number
  weight: number
}

export interface VitaminEntryCreate {
  vitamin_id: number
  value: number
  source: 'lab' | 'symptom'
}

export interface SymptomSubmit {
  symptom_ids: number[]
}
