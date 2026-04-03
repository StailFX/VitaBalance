/** JWT token pair returned by login/refresh endpoints */
export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

/** Login payload (sent as form-urlencoded) */
export interface LoginPayload {
  username: string
  password: string
}

/** Registration payload */
export interface RegisterPayload {
  email: string
  password: string
}

/** Password change payload */
export interface PasswordChangePayload {
  old_password: string
  new_password: string
}
