// app/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          username: string | null
          avatar_url: string | null
          total_xp: number
          current_rank: string
          skills: string[] | null
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          username?: string | null
          total_xp?: number
          current_rank?: string
        }
        Update: {
          username?: string | null
          avatar_url?: string | null
          total_xp?: number
          current_rank?: string
        }
      }
      jobs: {
        Row: {
          id: number
          title: string
          description: string
          reward_amount: string | null
          required_rank: string | null
          is_active: boolean
          created_at: string
        }
      }
      job_applications: {
        Row: {
          id: number
          job_id: number
          user_id: string
          status: 'pending' | 'approved' | 'rejected'
          message: string | null
          created_at: string
        }
      }
      // 必要に応じて他のテーブルも追加
    }
  }
}