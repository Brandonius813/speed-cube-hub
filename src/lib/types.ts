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
  title: string | null;
  notes: string | null;
  created_at: string;
};

export type FeedItem = Session & {
  profile: {
    display_name: string;
    handle: string;
    avatar_url: string | null;
  };
};
