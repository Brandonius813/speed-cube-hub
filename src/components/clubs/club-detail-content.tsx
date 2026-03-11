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
  ShieldCheck,
  Target,
  Trash2,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react"
import { joinClub, leaveClub, deleteClub, updateClub } from "@/lib/actions/club-mutations"
import { ChallengeCard } from "@/components/challenges/challenge-card"
import { EditClubModal } from "@/components/clubs/edit-club-modal"
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
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "members">("overview")
  const [showEditModal, setShowEditModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [challenges, setChallenges] = useState(initialChallenges)

  const isOwner = club.user_role === "owner"
  const isAdmin = club.user_role === "admin"
  const canManage = isOwner || isAdmin
  const activeChallenges = challenges.filter((challenge) => challenge.end_date >= new Date().toISOString().slice(0, 10))
  const recentActivity = feedItems.slice(0, 2)
  const topMember = leaderboard[0] ?? null

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
    visibility: "public" | "private"
  ) {
    setShowEditModal(false)
    startTransition(async () => {
      const result = await updateClub(club.id, { name, description, visibility })
      if (result.success) {
        setClub((prev) => ({
          ...prev,
          name,
          description: description || null,
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

      <Card className="mb-6 border-border/50 bg-card">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{club.name}</h1>
                <Badge variant="outline" className="border-border/50 bg-secondary/50">
                  {club.visibility}
                </Badge>
              </div>
              {club.description ? (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {club.description}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span className="font-mono text-foreground">{club.member_count}</span>
                  members
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Target className="h-4 w-4" />
                  <span className="font-mono text-foreground">{activeChallenges.length}</span>
                  active challenges
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Activity className="h-4 w-4" />
                  <span className="font-mono text-foreground">{feedItems.length}</span>
                  recent updates
                </span>
              </div>
            </div>

            {currentUserId ? (
              <div className="flex flex-wrap gap-2">
                {canManage ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowEditModal(true)}
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
                    onClick={handleDelete}
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
                  onClick={handleJoinLeave}
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

      <div className="mb-6 overflow-x-auto">
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
              label="Recent Activity"
              value={feedItems.length.toString()}
              helper="Fresh posts and sessions from club members."
              icon={Activity}
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

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Recent Club Activity</h2>
              <p className="text-sm text-muted-foreground">
                The latest training updates from members.
              </p>
            </div>

            {recentActivity.length === 0 ? (
              <Card className="border-border/50 bg-card">
                <CardContent className="p-6 text-sm text-muted-foreground">
                  No club activity yet. As members post and train, it will appear here.
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                {recentActivity.map((item) => (
                  <FeedEntryCard key={`${item.entry_type}-${item.id}`} entry={item} currentUserId={currentUserId} />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "activity" ? (
        <div className="flex flex-col gap-4">
          {feedItems.length === 0 ? (
            <Card className="border-border/50 bg-card">
              <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                <Activity className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No activity yet. Club members&apos; posts and sessions will show up here.
                </p>
              </CardContent>
            </Card>
          ) : (
            feedItems.map((item) => (
              <FeedEntryCard key={`${item.entry_type}-${item.id}`} entry={item} currentUserId={currentUserId} />
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

      <EditClubModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        clubName={club.name}
        clubDescription={club.description ?? ""}
        clubVisibility={club.visibility}
        onSave={handleEditSaved}
      />
    </div>
  )
}
