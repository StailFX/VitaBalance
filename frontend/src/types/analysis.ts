export type VitaminStatus = 'deficiency' | 'normal' | 'excess' | 'no_data'

export interface VitaminAnalysisItem {
  vitamin_id: number
  vitamin_name: string
  value: number | null
  unit: string
  norm_min: number
  norm_max: number
  status: VitaminStatus
  severity: number
}

export interface HistoryVitaminEntry {
  vitamin_id: number
  vitamin_name: string
  value: number
  unit: string
  status: VitaminStatus
}

export interface AnalysisSnapshot {
  date: string
  entries: HistoryVitaminEntry[]
}

export interface ComparisonItem {
  vitamin_name: string
  date1_value: number | null
  date2_value: number | null
  change_percent: number | null
  status1: string
  status2: string
}
