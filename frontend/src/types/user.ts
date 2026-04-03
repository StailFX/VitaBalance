export interface UserProfile {
  gender: 'male' | 'female' | null
  age: number | null
  height_cm: number | null
  weight_kg: number | null
}

export interface UserOut {
  id: number
  email: string
  profile: UserProfile | null
}

export interface ProfileUpdate {
  gender?: 'male' | 'female' | null
  age?: number | null
  height_cm?: number | null
  weight_kg?: number | null
}
