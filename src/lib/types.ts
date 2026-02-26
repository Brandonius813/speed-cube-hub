export type ProfileCube = {
  name: string;
  setup: string;
  event: string;
};

export type ProfileLink = {
  platform: string;
  url: string;
  label: string;
};

export type ProfileAccomplishment = {
  title: string;
  date: string | null;
};

export type Profile = {
  id: string;
  display_name: string;
  handle: string;
  bio: string | null;
  avatar_url: string | null;
  wca_id: string | null;
  location: string | null;
  sponsor: string | null;
  events: string[];
  cubes: ProfileCube[];
  links: ProfileLink[];
  accomplishments: ProfileAccomplishment[];
  country_id: string | null;
  main_event: string | null;
  wca_event_order: string[] | null;
  pb_visible_types: string[] | null;
  pbs_main_events: string[] | null;
  created_at: string;
  updated_at: string;
};

export type Session = {
  id: string;
  user_id: string;
  session_date: string;
  event: string;
  practice_type: string;
  num_solves: number | null;
  num_dnf: number | null;
  duration_minutes: number;
  avg_time: number | null;
  best_time: number | null;
  title: string | null;
  notes: string | null;
  feed_visible?: boolean;
  timer_session_id?: string | null;
  created_at: string;
};

export type FeedItem = Session & {
  profile: {
    display_name: string;
    handle: string;
    avatar_url: string | null;
  };
  like_count: number;
  has_liked: boolean;
  comment_count: number;
};

export type Goal = {
  id: string;
  user_id: string;
  event: string;
  target_avg: number;
  target_date: string;
  status: "active" | "achieved" | "expired";
  achieved_at: string | null;
  created_at: string;
};

export type Comment = {
  id: string;
  session_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile: {
    display_name: string;
    handle: string;
    avatar_url: string | null;
  };
};

export type LeaderboardEntry = {
  rank: number;
  user_id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  stat_value: number;
};

export type WrappedStats = {
  year: number;
  totalSolves: number;
  totalHours: number;
  totalSessions: number;
  mostPracticedEvent: string | null;
  biggestPBImprovement: { event: string; improvement: number } | null;
  longestStreak: number;
  eventsPracticed: number;
  monthlyBreakdown: { month: string; solves: number; hours: number }[];
  topEvents: { event: string; solves: number; hours: number }[];
};

export type Badge = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: "competition" | "sponsor" | "milestone";
  tier: "gold" | "silver" | "bronze" | "standard";
  criteria_type: string | null;
  criteria_value: number | null;
  verification: "auto" | "self" | "admin";
};

export type UserBadge = {
  id: string;
  user_id: string;
  badge_id: string;
  year: number | null;
  detail: string | null;
  is_current: boolean;
  verified: boolean;
  earned_at: string;
  badge: Badge;
};

export type Notification = {
  id: string;
  user_id: string;
  type: "like" | "comment" | "follow" | "pb" | "badge";
  actor_id: string | null;
  reference_id: string | null;
  read: boolean;
  created_at: string;
  actor?: {
    display_name: string;
    handle: string;
    avatar_url: string | null;
  };
};

export type Club = {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  member_count: number;
  is_member: boolean;
  user_role?: string | null;
};

export type ClubMember = {
  user_id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  role: string;
  joined_at: string;
};

export type PBRecord = {
  id: string
  user_id: string
  event: string
  pb_type: string
  time_seconds: number
  date_achieved: string
  is_current: boolean
  notes: string | null
  created_at: string
  mbld_solved: number | null
  mbld_attempted: number | null
}

export type PendingBadgeClaim = {
  id: string;
  user_id: string;
  badge_id: string;
  year: number | null;
  detail: string | null;
  is_current: boolean;
  verified: boolean;
  earned_at: string;
  badge: Badge;
  profile: {
    display_name: string;
    handle: string;
    avatar_url: string | null;
  };
};

export type TimerSession = {
  id: string;
  user_id: string;
  event: string;
  mode: "normal" | "comp_sim";
  status: "active" | "completed";
  started_at: string;
  ended_at: string | null;
  session_id: string | null;
  created_at: string;
};

export type Solve = {
  id: string;
  timer_session_id: string;
  user_id: string;
  solve_number: number;
  time_ms: number;
  penalty: "+2" | "DNF" | null;
  scramble: string;
  event: string;
  comp_sim_group: number | null;
  notes: string | null;
  solved_at: string;
  created_at: string;
};

export type Challenge = {
  id: string;
  title: string;
  description: string | null;
  type: "solves" | "time" | "streak" | "events";
  target_value: number;
  start_date: string;
  end_date: string;
  created_at: string;
  participant_count: number;
  has_joined: boolean;
  user_progress?: number;
};
