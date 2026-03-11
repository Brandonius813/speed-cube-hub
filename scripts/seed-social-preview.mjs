#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";

const previewPassword = "speedcube-preview";
const previewPrefix = "[Preview]";
const args = new Set(process.argv.slice(2));
const shouldReset = args.has("--reset");
const shouldCleanup = args.has("--cleanup");
const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { loadEnvConfig } = nextEnv;

loadEnvConfig(projectDir);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const demoUsers = [
  {
    handle: "preview-brandon",
    email: "preview+brandon@speedcubehub.dev",
    display_name: "Brandon Preview",
    bio: "Founder energy, always launching something for the cubing community.",
    location: "New York, USA",
    events: ["333", "222", "333oh"],
    main_event: "333",
    main_events: ["333", "222", "333oh"],
  },
  {
    handle: "preview-lena",
    email: "preview+lena@speedcubehub.dev",
    display_name: "Lena Cross",
    bio: "Cross trainer nerd. Posts scrambles, drills, and PB reactions.",
    location: "Berlin, Germany",
    events: ["333", "444", "333oh"],
    main_event: "333",
    main_events: ["333", "444", "333oh"],
  },
  {
    handle: "preview-mateo",
    email: "preview+mateo@speedcubehub.dev",
    display_name: "Mateo Blocks",
    bio: "Competition-focused solver with a habit of posting session breakdowns.",
    location: "Austin, USA",
    events: ["333", "555", "minx"],
    main_event: "333",
    main_events: ["333", "555", "minx"],
  },
  {
    handle: "preview-ari",
    email: "preview+ari@speedcubehub.dev",
    display_name: "Ari Timer",
    bio: "Tracking every solve and every average. Loves clean charts.",
    location: "Toronto, Canada",
    events: ["333", "222", "skewb"],
    main_event: "333",
    main_events: ["333", "222", "skewb"],
  },
  {
    handle: "preview-noah",
    email: "preview+noah@speedcubehub.dev",
    display_name: "Noah Slice",
    bio: "Square-1, big cubes, and puzzle reviews.",
    location: "Chicago, USA",
    events: ["sq1", "444", "555"],
    main_event: "sq1",
    main_events: ["sq1", "444", "555"],
  },
  {
    handle: "preview-riley",
    email: "preview+riley@speedcubehub.dev",
    display_name: "Riley Recon",
    bio: "Competition recaps, photo dumps, and fresh puzzle mail days.",
    location: "Los Angeles, USA",
    events: ["333", "pyram", "skewb"],
    main_event: "333",
    main_events: ["333", "pyram", "skewb"],
  },
  {
    handle: "preview-sora",
    email: "preview+sora@speedcubehub.dev",
    display_name: "Sora Roux",
    bio: "Roux advocate posting slow-solve notes and session reflections.",
    location: "Tokyo, Japan",
    events: ["333", "clock", "sq1"],
    main_event: "333",
    main_events: ["333", "clock", "sq1"],
  },
  {
    handle: "preview-jules",
    email: "preview+jules@speedcubehub.dev",
    display_name: "Jules Layer",
    bio: "Beginner-friendly creator sharing progress and challenge check-ins.",
    location: "London, UK",
    events: ["333", "222", "pyram"],
    main_event: "333",
    main_events: ["333", "222", "pyram"],
  },
];

function daysAgo(days, hour = 18) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, 15, 0, 0);
  return date.toISOString();
}

function sessionDate(days) {
  return daysAgo(days).slice(0, 10);
}

async function listAllUsers() {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) throw error;

    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < 200) break;
    page += 1;
  }

  return users;
}

async function deleteWhereIn(table, column, values) {
  if (!values.length) return;
  const { error } = await supabase.from(table).delete().in(column, values);
  if (error) throw error;
}

async function resetPreviewData(existingUsers) {
  const userIds = existingUsers.map((user) => user.id);
  if (userIds.length === 0) return;

  const [{ data: posts }, { data: sessions }, { data: clubs }, { data: challenges }] = await Promise.all([
    supabase.from("posts").select("id").in("user_id", userIds),
    supabase.from("sessions").select("id").in("user_id", userIds),
    supabase.from("clubs").select("id").in("created_by", userIds),
    supabase.from("challenges").select("id").in("created_by", userIds),
  ]);

  const postIds = (posts ?? []).map((row) => row.id);
  const sessionIds = (sessions ?? []).map((row) => row.id);
  const clubIds = (clubs ?? []).map((row) => row.id);
  const challengeIds = (challenges ?? []).map((row) => row.id);

  await deleteWhereIn("comments", "user_id", userIds);
  if (postIds.length) await deleteWhereIn("comments", "post_id", postIds);
  if (sessionIds.length) await deleteWhereIn("comments", "session_id", sessionIds);
  await deleteWhereIn("likes", "user_id", userIds);
  if (postIds.length) await deleteWhereIn("likes", "post_id", postIds);
  if (sessionIds.length) await deleteWhereIn("likes", "session_id", sessionIds);
  await deleteWhereIn("post_media", "post_id", postIds);
  await deleteWhereIn("post_tags", "post_id", postIds);
  await deleteWhereIn("favorite_follows", "follower_id", userIds);
  await deleteWhereIn("favorite_follows", "following_id", userIds);
  await deleteWhereIn("muted_users", "user_id", userIds);
  await deleteWhereIn("muted_users", "muted_user_id", userIds);
  await deleteWhereIn("follows", "follower_id", userIds);
  await deleteWhereIn("follows", "following_id", userIds);
  await deleteWhereIn("challenge_participants", "user_id", userIds);
  await deleteWhereIn("challenge_participants", "challenge_id", challengeIds);
  await deleteWhereIn("club_members", "user_id", userIds);
  await deleteWhereIn("club_members", "club_id", clubIds);

  const maybeDeletePersonalBests = await supabase
    .from("personal_bests")
    .delete()
    .in("user_id", userIds);
  if (maybeDeletePersonalBests.error && maybeDeletePersonalBests.error.code !== "PGRST205") {
    throw maybeDeletePersonalBests.error;
  }

  await deleteWhereIn("posts", "id", postIds);
  await deleteWhereIn("sessions", "id", sessionIds);
  await deleteWhereIn("challenges", "id", challengeIds);
  await deleteWhereIn("clubs", "id", clubIds);
  await deleteWhereIn("profiles", "id", userIds);

  for (const user of existingUsers) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) throw error;
  }
}

async function ensureUsers() {
  const existingUsers = await listAllUsers();
  const byEmail = new Map(existingUsers.map((user) => [user.email, user]));
  const users = [];

  for (const demoUser of demoUsers) {
    let user = byEmail.get(demoUser.email);
    if (!user) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: demoUser.email,
        password: previewPassword,
        email_confirm: true,
        user_metadata: { preview_seed: true },
      });
      if (error) throw error;
      user = data.user;
    }
    users.push({
      ...demoUser,
      id: user.id,
      avatar_url: `https://api.dicebear.com/9.x/thumbs/svg?seed=${demoUser.handle}`,
    });
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    users.map((user) => ({
      id: user.id,
      display_name: user.display_name,
      handle: user.handle,
      bio: user.bio,
      avatar_url: user.avatar_url,
      location: user.location,
      events: user.events,
      main_event: user.main_event,
      main_events: user.main_events,
    })),
    { onConflict: "id" }
  );

  if (profileError) throw profileError;
  return users;
}

async function seedSessions(users) {
  const rows = [
    {
      user_id: users[0].id,
      session_date: sessionDate(0),
      event: "333",
      practice_type: "Solves",
      num_solves: 87,
      num_dnf: 0,
      duration_minutes: 52,
      avg_time: 12.41,
      best_time: 8.92,
      title: `${previewPrefix} Evening 3x3 Session`,
      notes: "Cross stayed clean. Last 20 solves felt locked in.",
      feed_visible: true,
      created_at: daysAgo(0, 21),
    },
    {
      user_id: users[1].id,
      session_date: sessionDate(1),
      event: "333",
      practice_type: "Slow Solves",
      num_solves: 24,
      num_dnf: 0,
      duration_minutes: 46,
      avg_time: 18.72,
      best_time: 14.83,
      title: `${previewPrefix} Cross + F2L Breakdown`,
      notes: "Worked specifically on first pair visibility.",
      feed_visible: true,
      created_at: daysAgo(1, 19),
    },
    {
      user_id: users[2].id,
      session_date: sessionDate(2),
      event: "555",
      practice_type: "Solves",
      num_solves: 31,
      num_dnf: 0,
      duration_minutes: 61,
      avg_time: 62.85,
      best_time: 54.11,
      title: `${previewPrefix} Big Cube Grind`,
      notes: "Edges finally felt smoother than yesterday.",
      feed_visible: true,
      created_at: daysAgo(2, 20),
    },
    {
      user_id: users[4].id,
      session_date: sessionDate(1),
      event: "sq1",
      practice_type: "Solves",
      num_solves: 42,
      num_dnf: 1,
      duration_minutes: 49,
      avg_time: 17.35,
      best_time: 11.88,
      title: `${previewPrefix} Square-1 Morning Session`,
      notes: "Hit a clean shape shift streak halfway through.",
      feed_visible: true,
      created_at: daysAgo(1, 14),
    },
  ];

  const { data, error } = await supabase
    .from("sessions")
    .insert(rows)
    .select("id, user_id, title");

  if (error) throw error;
  return data ?? [];
}

async function seedPBs(users) {
  const rows = [
    {
      user_id: users[1].id,
      event: "333",
      pb_type: "single",
      time_seconds: 7.91,
      date_achieved: sessionDate(0),
      is_current: true,
      notes: `${previewPrefix} First official sub-8 feeling`,
    },
    {
      user_id: users[0].id,
      event: "333",
      pb_type: "ao5",
      time_seconds: 9.88,
      date_achieved: sessionDate(1),
      is_current: true,
      notes: `${previewPrefix} Best controlled average so far`,
    },
  ];

  const { data, error } = await supabase
    .from("personal_bests")
    .insert(rows)
    .select("id, user_id, event, pb_type");

  if (error && error.code !== "PGRST205") {
    throw error;
  }

  return data ?? [];
}

async function seedClubs(users) {
  const { data, error } = await supabase
    .from("clubs")
    .insert([
      {
        name: `${previewPrefix} Daily Solvers`,
        description: "Public club for consistent daily practice and session recaps.",
        avatar_url: "https://api.dicebear.com/9.x/shapes/svg?seed=daily-solvers-club",
        created_by: users[0].id,
        visibility: "public",
      },
      {
        name: `${previewPrefix} Brandon Bootcamp`,
        description: "Private coaching pod with weekly accountability challenges.",
        avatar_url: "https://api.dicebear.com/9.x/shapes/svg?seed=bootcamp-club",
        created_by: users[0].id,
        visibility: "private",
      },
    ])
    .select("id, name, created_by");

  if (error) throw error;

  const publicClub = data.find((club) => club.name.includes("Daily Solvers"));
  const privateClub = data.find((club) => club.name.includes("Bootcamp"));

  const members = [
    { club_id: publicClub.id, user_id: users[0].id, role: "owner" },
    { club_id: publicClub.id, user_id: users[1].id, role: "member" },
    { club_id: publicClub.id, user_id: users[2].id, role: "member" },
    { club_id: publicClub.id, user_id: users[7].id, role: "member" },
    { club_id: privateClub.id, user_id: users[0].id, role: "owner" },
    { club_id: privateClub.id, user_id: users[3].id, role: "member" },
    { club_id: privateClub.id, user_id: users[5].id, role: "member" },
  ];

  const { error: memberError } = await supabase.from("club_members").insert(members);
  if (memberError) throw memberError;

  return { publicClub, privateClub };
}

async function seedChallenges(users, clubs) {
  const { data, error } = await supabase
    .from("challenges")
    .insert([
      {
        title: `${previewPrefix} Community Sub-10 Push`,
        description: "Whole-app challenge: post your best 3x3 training this week.",
        type: "solves",
        scope: "official",
        target_value: 300,
        start_date: sessionDate(2),
        end_date: sessionDate(-5).slice(0, 10),
        created_by: users[0].id,
      },
      {
        title: `${previewPrefix} Bootcamp 150 Solves`,
        description: "Private club challenge for the coaching pod.",
        type: "solves",
        scope: "club",
        club_id: clubs.privateClub.id,
        target_value: 150,
        start_date: sessionDate(1),
        end_date: sessionDate(-4).slice(0, 10),
        created_by: users[0].id,
      },
    ])
    .select("id, title, scope");

  if (error) throw error;

  const official = data.find((challenge) => challenge.scope === "official");
  const club = data.find((challenge) => challenge.scope === "club");

  const { error: participantsError } = await supabase
    .from("challenge_participants")
    .insert([
      { challenge_id: official.id, user_id: users[0].id, progress: 180 },
      { challenge_id: official.id, user_id: users[1].id, progress: 240 },
      { challenge_id: official.id, user_id: users[2].id, progress: 112 },
      { challenge_id: club.id, user_id: users[0].id, progress: 120 },
      { challenge_id: club.id, user_id: users[3].id, progress: 98 },
      { challenge_id: club.id, user_id: users[5].id, progress: 74 },
    ]);

  if (participantsError) throw participantsError;

  return { official, club };
}

async function seedFollows(users) {
  const byHandle = Object.fromEntries(users.map((user) => [user.handle, user.id]));

  const follows = [
    ["preview-brandon", "preview-lena"],
    ["preview-brandon", "preview-mateo"],
    ["preview-brandon", "preview-riley"],
    ["preview-brandon", "preview-jules"],
    ["preview-lena", "preview-brandon"],
    ["preview-lena", "preview-sora"],
    ["preview-mateo", "preview-brandon"],
    ["preview-ari", "preview-brandon"],
    ["preview-riley", "preview-brandon"],
    ["preview-jules", "preview-brandon"],
  ].map(([follower, following]) => ({
    follower_id: byHandle[follower],
    following_id: byHandle[following],
  }));

  const favorites = [
    { follower_id: byHandle["preview-brandon"], following_id: byHandle["preview-lena"] },
    { follower_id: byHandle["preview-brandon"], following_id: byHandle["preview-riley"] },
  ];

  const muted = [
    { user_id: byHandle["preview-brandon"], muted_user_id: byHandle["preview-noah"] },
  ];

  const { error: followsError } = await supabase.from("follows").insert(follows);
  if (followsError) throw followsError;

  const { error: favoritesError } = await supabase.from("favorite_follows").insert(favorites);
  if (favoritesError) throw favoritesError;

  const { error: mutedError } = await supabase.from("muted_users").insert(muted);
  if (mutedError) throw mutedError;
}

async function seedPosts(users, sessions, pbs, challenges, clubs) {
  const sessionByUser = Object.fromEntries(sessions.map((session) => [session.user_id, session]));
  const pbByUser = Object.fromEntries(pbs.map((pb) => [pb.user_id, pb]));

  const postRows = [
    {
      user_id: users[1].id,
      title: `${previewPrefix} Sub-8 single`,
      content: "Finally hit 7.91 today. Best part is that the solve felt clean, not lucky.",
      post_type: "pb",
      visibility: "public",
      created_at: daysAgo(0, 20),
    },
    {
      user_id: users[5].id,
      title: `${previewPrefix} Sacramento Open recap`,
      content: "Comp nerves were rough in round one, but the finals were the calmest solving I've had all year.",
      post_type: "competition",
      visibility: "public",
      created_at: daysAgo(1, 18),
    },
    {
      user_id: users[0].id,
      title: `${previewPrefix} Whole-app challenge live`,
      content: "Community challenge is up. Log solves, post recaps, and let's make this app feel alive this week.",
      post_type: "text",
      visibility: "public",
      created_at: daysAgo(0, 17),
    },
    {
      user_id: users[7].id,
      club_id: clubs.publicClub.id,
      title: `${previewPrefix} Challenge check-in`,
      content: "Finished day four of the community solve streak. The feed makes me want to keep going.",
      post_type: "text",
      visibility: "club",
      created_at: daysAgo(0, 16),
    },
    {
      user_id: users[6].id,
      title: `${previewPrefix} New puzzle day`,
      content: "Picked up a new magnetic Square-1 and I already know I'm going to lose hours to this thing.",
      post_type: "text",
      visibility: "public",
      created_at: daysAgo(2, 16),
    },
    {
      user_id: users[2].id,
      title: `${previewPrefix} Session breakdown`,
      content: "Big cubes were slower, but centers stayed consistent. That feels fixable.",
      post_type: "session_recap",
      visibility: "public",
      created_at: daysAgo(2, 21),
    },
  ];

  const { data: posts, error } = await supabase
    .from("posts")
    .insert(postRows)
    .select("id, user_id, post_type");

  if (error) throw error;

  const postByType = Object.fromEntries(posts.map((post) => [`${post.user_id}:${post.post_type}`, post.id]));

  const { error: mediaError } = await supabase.from("post_media").insert([
    {
      post_id: postByType[`${users[5].id}:competition`],
      url: "https://picsum.photos/seed/sch-comp/1200/900",
      alt_text: "Competition recap photo",
      sort_order: 0,
    },
    {
      post_id: postByType[`${users[5].id}:competition`],
      url: "https://picsum.photos/seed/sch-comp-2/1200/900",
      alt_text: "Competition recap crowd photo",
      sort_order: 1,
    },
    {
      post_id: postByType[`${users[6].id}:text`],
      url: "https://picsum.photos/seed/sch-puzzle/1200/900",
      alt_text: "New puzzle desk photo",
      sort_order: 0,
    },
  ]);
  if (mediaError) throw mediaError;

  const { error: tagsError } = await supabase.from("post_tags").insert([
    {
      post_id: postByType[`${users[1].id}:pb`],
      tag_type: "pb",
      reference_id: pbByUser[users[1].id]?.id ?? null,
      label: "3x3 single",
      metadata: {
        event: "333",
        pb_type: "single",
        time_seconds: 7.91,
        scramble: "R U R' F2 U2 L2 D' R2 U F'",
      },
    },
    {
      post_id: postByType[`${users[5].id}:competition`],
      tag_type: "competition",
      reference_id: "SacramentoOpen2026",
      label: "Sacramento Open 2026",
      metadata: { city: "Sacramento" },
    },
    {
      post_id: postByType[`${users[0].id}:text`],
      tag_type: "challenge",
      reference_id: challenges.official.id,
      label: "Community Sub-10 Push",
      metadata: { scope: "official" },
    },
    {
      post_id: postByType[`${users[6].id}:text`],
      tag_type: "puzzle",
      reference_id: null,
      label: "Magnetic Square-1",
      metadata: { category: "puzzle" },
    },
    {
      post_id: postByType[`${users[2].id}:session_recap`],
      tag_type: "session",
      reference_id: sessionByUser[users[2].id]?.id ?? null,
      label: "5x5 session",
      metadata: { event: "555" },
    },
    {
      post_id: postByType[`${users[0].id}:text`],
      tag_type: "challenge",
      reference_id: challenges.club.id,
      label: `${previewPrefix} Bootcamp`,
      metadata: { scope: "club", club_id: clubs.privateClub.id },
    },
  ]);
  if (tagsError) throw tagsError;

  await supabase.from("likes").insert([
    { post_id: postByType[`${users[1].id}:pb`], user_id: users[0].id },
    { post_id: postByType[`${users[1].id}:pb`], user_id: users[2].id },
    { post_id: postByType[`${users[5].id}:competition`], user_id: users[0].id },
    { post_id: postByType[`${users[0].id}:text`], user_id: users[1].id },
    { post_id: postByType[`${users[0].id}:text`], user_id: users[7].id },
  ]);

  const { data: comments, error: commentError } = await supabase
    .from("comments")
    .insert([
      {
        post_id: postByType[`${users[1].id}:pb`],
        user_id: users[0].id,
        content: "This is exactly the kind of post that makes the app feel alive.",
      },
      {
        post_id: postByType[`${users[5].id}:competition`],
        user_id: users[7].id,
        content: "Need the full finals recap when you get a chance.",
      },
      {
        session_id: sessionByUser[users[0].id]?.id,
        user_id: users[1].id,
        content: "That 8.92 best single is ridiculous.",
      },
    ])
    .select("id, content");
  if (commentError) throw commentError;

  const pbComment = comments.find((comment) =>
    comment.content.includes("makes the app feel alive")
  );
  if (pbComment) {
    const { error: replyError } = await supabase.from("comments").insert({
      post_id: postByType[`${users[1].id}:pb`],
      parent_comment_id: pbComment.id,
      user_id: users[1].id,
      content: "Exactly. PBs should feel social, not like a spreadsheet update.",
    });
    if (replyError) throw replyError;
  }

  const { error: pinError } = await supabase
    .from("clubs")
    .update({ pinned_post_id: postByType[`${users[1].id}:pb`] })
    .eq("id", clubs.publicClub.id);
  if (pinError && pinError.code !== "PGRST204") throw pinError;

  const { error: privatePinError } = await supabase
    .from("clubs")
    .update({ pinned_post_id: postByType[`${users[2].id}:session_recap`] })
    .eq("id", clubs.privateClub.id);
  if (privatePinError && privatePinError.code !== "PGRST204") throw privatePinError;
}

async function main() {
  const allUsers = await listAllUsers();
  const existingPreviewUsers = allUsers.filter((user) =>
    demoUsers.some((demoUser) => demoUser.email === user.email)
  );

  if (shouldCleanup) {
    await resetPreviewData(existingPreviewUsers);
    console.log("Removed social preview seed data.");
    return;
  }

  if (!shouldReset && existingPreviewUsers.length > 0) {
    console.log("Preview seed data already exists. Run `npm run preview:reseed` to reset it.");
    console.log(`Preview login: ${demoUsers[0].email} / ${previewPassword}`);
    return;
  }

  if (shouldReset) {
    await resetPreviewData(existingPreviewUsers);
  }

  const users = await ensureUsers();
  const sessions = await seedSessions(users);
  const pbs = await seedPBs(users);
  const clubs = await seedClubs(users);
  const challenges = await seedChallenges(users, clubs);
  await seedFollows(users);
  await seedPosts(users, sessions, pbs, challenges, clubs);

  console.log("Seeded social preview data.");
  console.log(`Preview login: ${demoUsers[0].email} / ${previewPassword}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
