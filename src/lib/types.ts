import type {
  CompSimEndedReason,
  CompSimFormat,
  CompSimScene,
} from "@/lib/timer/comp-sim-round";

export type ProfileCube = {
  name: string;
  setup: string;
  event: string;
};

export type CubeHistoryEntry = {
  name: string;
  setup: string;
  event: string;
  retired_at: string;
};

export type ProfileLink = {
  platform: string;
  url: string;
  label: string;
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
  cube_history: CubeHistoryEntry[];
  links: ProfileLink[];
  accomplishments: { title: string; date: string | null }[];
  country_id: string | null;
  main_event: string | null;
  main_events: string[];
  wca_event_order: string[] | null;
  pb_visible_types: string[] | null;
  pbs_main_events: string[] | null;
  pb_display_types: Record<string, string[]> | null;
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
  best_ao5?: number | null;
  best_ao12?: number | null;
  best_ao25?: number | null;
  best_ao50?: number | null;
  best_ao100?: number | null;
  best_ao200?: number | null;
  best_ao500?: number | null;
  best_ao1000?: number | null;
  title: string | null;
  notes: string | null;
  feed_visible?: boolean;
  timer_session_id?: string | null;
  solve_session_id?: string | null;
  comp_sim_format?: CompSimFormat | null;
  comp_sim_result_seconds?: number | null;
  comp_sim_scene?: CompSimScene | null;
  comp_sim_intensity?: number | null;
  comp_sim_time_limit_seconds?: number | null;
  comp_sim_cutoff_attempt?: 1 | 2 | null;
  comp_sim_cutoff_seconds?: number | null;
  comp_sim_ended_reason?: CompSimEndedReason | null;
  comp_sim_cutoff_met?: boolean | null;
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

export type PostType = "text" | "session_recap" | "pb" | "competition";

export type PostTagType = "session" | "pb" | "challenge" | "competition" | "puzzle";

export type PostMedia = {
  id: string;
  post_id: string;
  media_type: "image";
  url: string;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
};

export type PostTag = {
  id: string;
  post_id: string;
  tag_type: PostTagType;
  reference_id: string | null;
  label: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  club_id?: string | null;
  title: string | null;
  content: string;
  post_type: PostType;
  visibility: "public" | "club";
  created_at: string;
  updated_at: string;
  profile: {
    display_name: string;
    handle: string;
    avatar_url: string | null;
  };
  media: PostMedia[];
  tags: PostTag[];
  like_count: number;
  has_liked: boolean;
  comment_count: number;
};

export type SessionFeedEntry = FeedItem & {
  entry_type: "session";
  entry_created_at: string;
  best_ao5?: number | null;
  best_ao12?: number | null;
  best_ao25?: number | null;
  ranking_score?: number;
};

export type PostFeedEntry = Post & {
  entry_type: "post";
  entry_created_at: string;
  ranking_score?: number;
};

export type FeedEntry = SessionFeedEntry | PostFeedEntry;

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
  session_id: string | null;
  post_id: string | null;
  parent_comment_id: string | null;
  user_id: string;
  content: string;
  created_at: string;
  profile: {
    display_name: string;
    handle: string;
    avatar_url: string | null;
  };
};

export type CommentThread = Comment & {
  replies: Comment[];
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

export type Notification = {
  id: string;
  user_id: string;
  type: "like" | "comment" | "follow" | "pb";
  actor_id: string | null;
  reference_id: string | null;
  read: boolean;
  created_at: string;
  preview_text: string | null;
  actor?: {
    display_name: string;
    handle: string;
    avatar_url: string | null;
  };
  // Set by the grouping pass in getNotifications when multiple unread likes
  // share the same reference_id. group_ids contains every underlying row id
  // so the client can mark them all read together.
  group_count?: number;
  group_ids?: string[];
};

export type Club = {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  pinned_post_id?: string | null;
  created_by: string;
  visibility: "public" | "private";
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

export type ClubLeaderboardEntry = {
  user_id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  session_count: number;
  total_solves: number;
  total_minutes: number;
  best_single: number | null;
  best_mean: number | null;
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

export type SolveSession = {
  id: string;
  user_id: string;
  name: string;
  event: string;
  is_tracked: boolean;
  is_archived: boolean;
  active_from: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  solve_count?: number;
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
  solve_session_id: string | null;
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
  phases?: number[] | null;
  solve_session_id: string | null;
  solved_at: string;
  created_at: string;
};

export type SolveSessionSummary = {
  solve_session_id: string;
  user_id: string;
  event: string;
  solve_count: number;
  dnf_count: number;
  valid_solve_count: number;
  total_effective_time_ms: number;
  best_single_ms: number | null;
  mean_ms: number | null;
  first_solved_at: string | null;
  last_solved_at: string | null;
  updated_at: string;
};

export type TimerMilestoneKey =
  | "ao5"
  | "ao12"
  | "ao25"
  | "ao50"
  | "ao100"
  | "ao200"
  | "ao500"
  | "ao1000";

export type TimerMilestoneSummaryRow = {
  key: TimerMilestoneKey;
  cur: number | null;
  best: number | null;
};

export type EventSummary = {
  user_id: string;
  event: string;
  solve_count: number;
  dnf_count: number;
  valid_solve_count: number;
  total_effective_time_ms: number;
  best_single_ms: number | null;
  mean_ms: number | null;
  current_ao5_ms: number | null;
  best_ao5_ms: number | null;
  current_ao12_ms: number | null;
  best_ao12_ms: number | null;
  current_ao25_ms: number | null;
  best_ao25_ms: number | null;
  current_ao50_ms: number | null;
  best_ao50_ms: number | null;
  current_ao100_ms: number | null;
  best_ao100_ms: number | null;
  current_ao200_ms: number | null;
  best_ao200_ms: number | null;
  current_ao500_ms: number | null;
  best_ao500_ms: number | null;
  current_ao1000_ms: number | null;
  best_ao1000_ms: number | null;
  first_solved_at: string | null;
  last_solved_at: string | null;
  updated_at: string;
};

export type TimerSavedSessionSummary = {
  id: string;
  timer_session_id: string;
  solve_count: number;
  mean_seconds: number | null;
  best_single_seconds: number | null;
  best_ao5: number | null;
  best_ao12: number | null;
  best_ao25: number | null;
  best_ao50: number | null;
  best_ao100: number | null;
  best_ao200: number | null;
  best_ao500: number | null;
  best_ao1000: number | null;
  created_at: string;
};

export type TimerSolveListSummary = {
  eventSummary: EventSummary | null;
  latestSavedSessionSummary: TimerSavedSessionSummary | null;
  milestoneRows: TimerMilestoneSummaryRow[];
};

export type SolveDailyRollup = {
  user_id: string;
  event: string;
  local_date: string;
  solve_count: number;
  dnf_count: number;
  valid_solve_count: number;
  total_effective_time_ms: number;
  best_single_ms: number | null;
  mean_ms: number | null;
  updated_at: string;
};

export type TimerAnalyticsDistributionBucket = {
  bucket_index: number;
  range_start_ms: number;
  range_end_ms: number;
  solve_count: number;
};

export type TimerAnalyticsTrendPoint = {
  label: string;
  local_date: string;
  solve_count: number;
  mean_ms: number | null;
  best_single_ms: number | null;
};

export type TimerEventAnalytics = {
  summary: EventSummary | null;
  daily: SolveDailyRollup[];
  trend: TimerAnalyticsTrendPoint[];
  distribution: TimerAnalyticsDistributionBucket[];
};

export type Challenge = {
  id: string;
  title: string;
  description: string | null;
  type: "solves" | "time" | "streak" | "events";
  scope: "official" | "club";
  club_id: string | null;
  target_value: number;
  start_date: string;
  end_date: string;
  created_at: string;
  participant_count: number;
  has_joined: boolean;
  user_progress?: number;
};

export type SearchTab = "all" | "people" | "posts" | "clubs" | "challenges";

export type SearchResults = {
  profiles: Profile[];
  posts: Post[];
  clubs: Club[];
  challenges: Challenge[];
};

export type UserOnboarding = {
  user_id: string;
  auto_launch_pending: boolean;
  profile_viewed_at: string | null;
  main_cube_added_at: string | null;
  bulk_imported_at: string | null;
  first_timer_solve_at: string | null;
  comp_sim_tried_at: string | null;
  feed_visited_at: string | null;
  clubs_searched_at: string | null;
  dismissed_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};
