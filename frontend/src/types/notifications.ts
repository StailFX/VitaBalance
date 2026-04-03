export interface NotificationItem {
  id: number
  title: string
  message: string
  type: 'deficiency' | 'excess' | 'achievement' | 'reminder' | 'info'
  read: boolean
  created_at: string
}

export interface UnreadCount {
  unread_count: number
}
