export type Profile = {
  id: string;
  display_name: string;
  handle: string;
  bio: string | null;
  avatar_url: string | null;
  wca_id: string | null;
  events: string[];
  created_at: string;
  updated_at: string;
};

export type Session = {
  id: string;
  user_id: string;
  session_date: string;
  event: string;
  practice_type: string;
  num_solves: number;
  duration_minutes: number;
  avg_time: number | null;
  notes: string | null;
  created_at: string;
};
