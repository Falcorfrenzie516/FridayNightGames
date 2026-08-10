import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      dice_games: {
        Row: {
          id: string;
          user_id: string;
          status: 'active' | 'completed';
          total_points: number;
          round_number: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          status?: 'active' | 'completed';
          total_points?: number;
          round_number?: number;
        };
        Update: {
          status?: 'active' | 'completed';
          total_points?: number;
          round_number?: number;
          updated_at?: string;
        };
      };
      game_rounds: {
        Row: {
          id: string;
          game_id: string;
          round_number: number;
          dice_rolls: number[];
          points_earned: number;
          created_at: string;
        };
        Insert: {
          game_id: string;
          round_number: number;
          dice_rolls: number[];
          points_earned?: number;
        };
      };
    };
  };
};
