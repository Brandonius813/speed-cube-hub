"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Activity,
  ArrowLeft,
  Crown,
  Flame,
  LogOut,
  Pencil,
  Pin,
  ShieldCheck,
  Target,
  Trash2,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react"
import {
  deleteClub,
  joinClub,
  leaveClub,
  updateClub,
} from "@/lib/actions/club-mutations"
import { ChallengeCard } from "@/components/challenges/challenge-card"
import { EditClubModal } from "@/components/clubs/edit-club-modal"
import { FeedComposer } from "@/components/feed/feed-composer"
import { FeedEntryCard } from "@/components/feed/feed-entry-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type {
  Challenge,
  Club,
  ClubLeaderboardEntry,
  ClubMember,
  FeedEntry,
} from "@/lib/types"
import { formatSolveTime } from "@/lib/utils"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function RoleBadge({ role }: { role: string }) {
  if (role === "owner") {
    return (
      <Badge className="gap-1 border-amber-500/30 bg-amber-500/20 text-amber-400">
        <Crown className="h-3 w-3" />
        Owner
      </Badge>
    )
  }
  if (role === "admin") {
    return (
      <Badge className="gap-1 border-primary/30 bg-primary/20 text-primary">
        <ShieldCheck className="h-3 w-3" />
        Admin
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="text-muted-foreground">
      Member
    </Badge>
  )
}

function OverviewStat({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string
  value: string
  helper: string
  icon: typeof Users
}) {
  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-xs uppercase tracking-[0.16em]">{label}</span>
        </div>
        <p className="font-mono text-3xl font-semibold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  )
}

function LeaderboardRow({
  entry,
  rank,
}: {
  entry: ClubLeaderboardEntry
  rank: number
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-secondary/20 p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-semibold text-primary">
        {rank}
      </div>
      <Avatar className="h-10 w-10 border border-primary/20">
        {entry.avatar_url ? (
          <AvatarImage src={entry.avatar_url} alt={entry.display_name} />
        ) : null}
        <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
          {getInitials(entry.display_name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <Link
          href={`/profile/${entry.handle}`}
          className="block truncate font-medium text-foreground transition-colors hover:text-primary"
        >
          {entry.display_name}
        </Link>
        <p className="text-xs text-muted-foreground">@{entry.handle}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right text-xs text-muted-foreground sm:grid-cols-4">
        <span>
          <span className="mr-1 font-mono text-foreground">{entry.total_solves}</span>
          solves
        </span>
        <span>
          <span className="mr-1 font-mono text-foreground">{entry.session_count}</span>
          sessions
        </span>
        <span>
          <span className="mr-1 font-mono text-foreground">{entry.total_minutes}</span>
          min
        </span>
        <span>
          <span className="mr-1 font-mono text-foreground">
            {entry.best_single !== null ? formatSolveTime(entry.best_single) : "—"}
          </span>
          best
        </span>
      </div>
    </div>
  )
}

function ClubSummaryCard({
  club,
  members,
  activeChallenges,
  feedItems,
  canManage,
  isOwner,
  currentUserId,
  isPending,
  onJoinLeave,
  onEdit,
  onDelete,
}: {
  club: Club
  members: ClubMember[]
  activeChallenges: Challenge[]
  feedItems: FeedEntry[]
  canManage: boolean
  isOwner: boolean
  currentUserId: string | null
  isPending: boolean
  onJoinLeave: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="overflow-hidden p-0">
        <div className="h-24 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.22),rgba(14,165,233,0.12),transparent_60%)]" />
        <div className="-mt-12 px-5 pb-5">
          <Avatar className="h-24 w-24 border-4 border-card shadow-lg shadow-black/30">
            {club.avatar_url ? <AvatarImage src={club.avatar_url} alt={club.name} /> : null}
            <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
              {getInitials(club.name)}
            </AvatarFallback>
          </Avatar>

          <div className="mt-5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold text-foreground">{club.name}</h1>
              <Badge variant="outline" className="border-border/50 bg-secondary/50 capitalize">
                {club.visibility}
              </Badge>
            </div>
            {club.description ? (
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                {club.description}
              </p>
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl border border-border/50 bg-secondary/20 p-4 text-center">
            <div>
              <p className="font-mono text-2xl font-semibold text-foreground">{club.member_count}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">Members</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-foreground">{activeChallenges.length}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">Live</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-foreground">{feedItems.length}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">Posts</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Members</p>
            <div className="mt-3 flex items-center">
              <div className="flex -space-x-3">
                {members.slice(0, 6).map((member) => (
                  <Avatar key={member.user_id} className="h-10 w-10 border-2 border-card">
                    {member.avatar_url ? (
                      <AvatarImage src={member.avatar_url} alt={member.display_name} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                      {getInitials(member.display_name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {members.length > 6 ? (
                <span className="ml-4 text-sm text-muted-foreground">+{members.length - 6} more</span>
              ) : null}
            </div>
          </div>

          {currentUserId ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {canManage ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onEdit}
                  className="border-border/50"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              ) : null}

              {isOwner ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onDelete}
                  disabled={isPending}
                  className="border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              ) : null}

              <Button
                size="sm"
                variant={club.is_member ? "outline" : "default"}
                onClick={onJoinLeave}
                disabled={isPending}
                className={
                  club.is_member
                    ? "border-border/50"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }
              >
                {club.is_member ? (
                  <>
                    <LogOut className="h-4 w-4" />
                    Leave
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Join
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export function ClubDetailContent({
  club: initialClub,
  members: initialMembers,
  feedItems,
  challenges: initialChallenges,
  leaderboard,
  leaderboardWindowDays,
  currentUserId,
}: {
  club: Club
  members: ClubMember[]
  feedItems: FeedEntry[]
  challenges: Challenge[]
  leaderboard: ClubLeaderboardEntry[]
  leaderboardWindowDays: number
  currentUserId: string | null
}) {
  const router = useRouter()
  const [club, setClub] = useState(initialClub)
  const [members, setMembers] = useState(initialMembers)
  const [clubFeedItems, setClubFeedItems] = useState(feedItems)
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "members">("overview")
  const [showEditModal, setShowEditModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [challenges, setChallenges] = useState(initialChallenges)

  const isOwner = club.user_role === "owner"
  const isAdmin = club.user_role === "admin"
  const canManage = isOwner || isAdmin
  const activeChallenges = challenges.filter(
    (challenge) => challenge.end_date >= new Date().toISOString().slice(0, 10)
  )
  const topMember = leaderboard[0] ?? null
  const pinnedPost = clubFeedItems.find(
    (item) => item.entry_type === "post" && item.id === club.pinned_post_id
  ) ?? null
  const activityItems = pinnedPost
    ? clubFeedItems.filter((item) => !(item.entry_type === "post" && item.id === pinnedPost.id))
    : clubFeedItems

  function handleJoinLeave() {
    if (!currentUserId) return

    startTransition(async () => {
      if (club.is_member) {
        const result = await leaveClub(club.id)
        if (result.success) {
          setClub((prev) => ({
            ...prev,
            is_member: false,
            member_count: prev.member_count - 1,
            user_role: null,
          }))
          setMembers((prev) => prev.filter((member) => member.user_id !== currentUserId))
        } else if (result.error) {
          alert(result.error)
        }
      } else {
        const result = await joinClub(club.id)
        if (result.success) {
          setClub((prev) => ({
            ...prev,
            is_member: true,
            member_count: prev.member_count + 1,
            user_role: "member",
          }))
          router.refresh()
        }
      }
    })
  }

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this club? This cannot be undone.")) {
      return
    }

    startTransition(async () => {
      const result = await deleteClub(club.id)
      if (result.success) {
        router.push("/clubs")
      } else if (result.error) {
        alert(result.error)
      }
    })
  }

  function handleEditSaved(
    name: string,
    description: string,
    avatarUrl: string,
    visibility: "public" | "private"
  ) {
    setShowEditModal(false)
    startTransition(async () => {
      const result = await updateClub(club.id, {
        name,
        description,
        avatar_url: avatarUrl,
        visibility,
      })
      if (result.success) {
        setClub((prev) => ({
          ...prev,
          name,
          description: description || null,
          avatar_url: avatarUrl || null,
          visibility,
        }))
      }
    })
  }

  function handleChallengeUpdate(updatedChallenge: Challenge) {
    setChallenges((prev) =>
      prev.map((challenge) =>
        challenge.id === updatedChallenge.id ? updatedChallenge : challenge
      )
    )
  }

  return (
    <div>
      <Link
        href="/clubs"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All Clubs
      </Link>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
        <div className="min-w-0 xl:max-w-5xl">
          <div className="xl:hidden">
            <ClubSummaryCard
              club={club}
              members={members}
              activeChallenges={activeChallenges}
              feedItems={clubFeedItems}
              canManage={canManage}
              isOwner={isOwner}
              currentUserId={currentUserId}
              isPending={isPending}
              onJoinLeave={handleJoinLeave}
              onEdit={() => setShowEditModal(true)}
              onDelete={handleDelete}
            />
          </div>

          <div className="mb-5 mt-6 overflow-x-auto xl:mt-0">
            <div className="flex min-w-max gap-1 rounded-lg border border-border/50 bg-card p-1">
              {[
                { id: "overview", label: "Overview", icon: Trophy },
                { id: "activity", label: "Activity", icon: Activity },
                { id: "members", label: `Members (${club.member_count})`, icon: Users },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id as "overview" | "activity" | "members")}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "overview" ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <OverviewStat
                  label="Members"
                  value={club.member_count.toString()}
                  helper="People practicing together in this club."
                  icon={Users}
                />
                <OverviewStat
                  label="Active Challenges"
                  value={activeChallenges.length.toString()}
                  helper="Current accountability loops for this group."
                  icon={Target}
                />
                <OverviewStat
                  label="Pinned Post"
                  value={club.pinned_post_id ? "Live" : "—"}
                  helper={club.pinned_post_id ? "A pinned club post is anchoring the feed." : "Admins can pin a member post from the activity tab."}
                  icon={Pin}
                />
                <OverviewStat
                  label="Top Solver"
                  value={topMember ? topMember.display_name.split(" ")[0] ?? topMember.display_name : "—"}
                  helper={
                    topMember
                      ? `${topMember.total_solves} solves in the last ${leaderboardWindowDays} days`
                      : "No leaderboard data yet."
                  }
                  icon={Flame}
                />
              </div>

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Club Challenges</h2>
                    <p className="text-sm text-muted-foreground">
                      Lightweight competitions that keep the club practicing together.
                    </p>
                  </div>
                  <Link href="/challenges" className="text-sm font-medium text-primary hover:text-primary/80">
                    View all challenges
                  </Link>
                </div>

                {challenges.length === 0 ? (
                  <Card className="border-border/50 bg-card">
                    <CardContent className="p-6 text-sm text-muted-foreground">
                      No club challenges yet. Create one from the challenges page when you want a shared goal.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-4">
                    {challenges.map((challenge) => (
                      <ChallengeCard
                        key={challenge.id}
                        challenge={challenge}
                        currentUserId={currentUserId}
                        onUpdate={handleChallengeUpdate}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Leaderboard</h2>
                  <p className="text-sm text-muted-foreground">
                    Ranked by solves logged in the last {leaderboardWindowDays} days, with sessions and best singles beside it.
                  </p>
                </div>

                {leaderboard.length === 0 ? (
                  <Card className="border-border/50 bg-card">
                    <CardContent className="p-6 text-sm text-muted-foreground">
                      Nobody has logged sessions in the last {leaderboardWindowDays} days yet.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-3">
                    {leaderboard.map((entry, index) => (
                      <LeaderboardRow key={entry.user_id} entry={entry} rank={index + 1} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {activeTab === "activity" ? (
            <div className="space-y-5">
              {currentUserId && club.is_member ? (
                <div className="flex justify-end">
                  <FeedComposer
                    clubId={club.id}
                    triggerLabel={`Post to ${club.name}`}
                    onCreated={(post) =>
                      setClubFeedItems((prev) => [
                        {
                          ...post,
                          entry_type: "post",
                          entry_created_at: post.created_at,
                        },
                        ...prev,
                      ])
                    }
                  />
                </div>
              ) : null}

              {pinnedPost ? (
                <section className="space-y-3">
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 px-4 py-4 text-center">
                    <p className="text-xs uppercase tracking-[0.22em] text-amber-200">Pinned Post</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      This post stays at the top of the club feed
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Use pinned posts for welcomes, announcements, and the club post everyone should see first.
                    </p>
                  </div>
                  <FeedEntryCard
                    entry={pinnedPost}
                    currentUserId={currentUserId}
                    clubContext={{
                      clubId: club.id,
                      canManage,
                      pinnedPostId: club.pinned_post_id ?? null,
                      onPinnedPostChange: (postId) =>
                        setClub((prev) => ({ ...prev, pinned_post_id: postId })),
                    }}
                  />
                </section>
              ) : null}

              {activityItems.length === 0 ? (
                <Card className="border-border/50 bg-card">
                  <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                    <Activity className="h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      No activity yet. Club members&apos; posts and sessions will show up here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                activityItems.map((item) => (
                  <FeedEntryCard
                    key={`${item.entry_type}-${item.id}`}
                    entry={item}
                    currentUserId={currentUserId}
                    clubContext={{
                      clubId: club.id,
                      canManage,
                      pinnedPostId: club.pinned_post_id ?? null,
                      onPinnedPostChange: (postId) =>
                        setClub((prev) => ({ ...prev, pinned_post_id: postId })),
                    }}
                  />
                ))
              )}
            </div>
          ) : null}

          {activeTab === "members" ? (
            <div className="flex flex-col gap-2">
              {members.map((member) => (
                <Card key={member.user_id} className="border-border/50 bg-card">
                  <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                    <Link href={`/profile/${member.handle}`}>
                      <Avatar className="h-10 w-10 border border-primary/20">
                        {member.avatar_url ? (
                          <AvatarImage src={member.avatar_url} alt={member.display_name} />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                          {getInitials(member.display_name)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/profile/${member.handle}`}
                        className="block truncate font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {member.display_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">@{member.handle}</p>
                    </div>

                    <RoleBadge role={member.role} />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-24 space-y-4">
            <ClubSummaryCard
              club={club}
              members={members}
              activeChallenges={activeChallenges}
              feedItems={clubFeedItems}
              canManage={canManage}
              isOwner={isOwner}
              currentUserId={currentUserId}
              isPending={isPending}
              onJoinLeave={handleJoinLeave}
              onEdit={() => setShowEditModal(true)}
              onDelete={handleDelete}
            />

            <Card className="border-border/50 bg-card">
              <CardContent className="p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Leaderboard ({leaderboardWindowDays}-day)
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-foreground">Club momentum</h2>
                </div>

                {leaderboard.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    No leaderboard data yet.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {leaderboard.slice(0, 3).map((entry, index) => (
                      <div key={entry.user_id} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-secondary/20 p-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-semibold text-primary">
                          {index + 1}
                        </div>
                        <Avatar className="h-10 w-10 border border-primary/20">
                          {entry.avatar_url ? (
                            <AvatarImage src={entry.avatar_url} alt={entry.display_name} />
                          ) : null}
                          <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                            {getInitials(entry.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">{entry.display_name}</p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-mono text-foreground">{entry.total_solves}</span> solves
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>

      <EditClubModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        clubName={club.name}
        clubDescription={club.description ?? ""}
        clubAvatarUrl={club.avatar_url ?? ""}
        clubVisibility={club.visibility}
        onSave={handleEditSaved}
      />
    </div>
  )
}
