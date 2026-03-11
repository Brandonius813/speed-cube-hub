"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Users,
  Activity,
  Pencil,
  Trash2,
  LogOut,
  UserPlus,
  ArrowLeft,
  Crown,
  ShieldCheck,
} from "lucide-react"
import { joinClub, leaveClub, deleteClub, updateClub } from "@/lib/actions/club-mutations"
import { FeedItem as FeedItemCard } from "@/components/feed/feed-item"
import { EditClubModal } from "@/components/clubs/edit-club-modal"
import type { Club, ClubMember, FeedItem } from "@/lib/types"

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

export function ClubDetailContent({
  club: initialClub,
  members: initialMembers,
  feedItems,
  currentUserId,
}: {
  club: Club
  members: ClubMember[]
  feedItems: FeedItem[]
  currentUserId: string | null
}) {
  const router = useRouter()
  const [club, setClub] = useState(initialClub)
  const [members, setMembers] = useState(initialMembers)
  const [activeTab, setActiveTab] = useState<"activity" | "members">("activity")
  const [showEditModal, setShowEditModal] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isOwner = club.user_role === "owner"
  const isAdmin = club.user_role === "admin"
  const canManage = isOwner || isAdmin

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
          setMembers((prev) => prev.filter((m) => m.user_id !== currentUserId))
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

  return (
    <div>
      {/* Back link */}
      <Link
        href="/clubs"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All Clubs
      </Link>

      {/* Club header */}
      <Card className="mb-6 border-border/50 bg-card">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-foreground">{club.name}</h1>
              {club.description && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {club.description}
                </p>
              )}
              <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="font-mono">{club.member_count}</span>
                <span>{club.member_count === 1 ? "member" : "members"}</span>
                <Badge variant="outline" className="ml-2 border-border/50 bg-secondary/50">
                  {club.visibility}
                </Badge>
              </div>
            </div>

            {currentUserId && (
              <div className="flex flex-wrap gap-2">
                {canManage && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowEditModal(true)}
                    className="border-border/50"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                )}

                {isOwner && (
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
                )}

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
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-border/50 bg-card p-1">
        <button
          onClick={() => setActiveTab("activity")}
          className={`flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "activity"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="h-4 w-4" />
          Activity
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "members"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Members ({club.member_count})
        </button>
      </div>

      {/* Activity tab */}
      {activeTab === "activity" && (
        <div className="flex flex-col gap-4">
          {feedItems.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-border/50 bg-card p-8 text-center">
              <Activity className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No activity yet. Club members&apos; practice sessions will show up here.
              </p>
            </div>
          ) : (
            feedItems.map((item) => (
              <FeedItemCard
                key={item.id}
                item={item}
                currentUserId={currentUserId}
              />
            ))
          )}
        </div>
      )}

      {/* Members tab */}
      {activeTab === "members" && (
        <div className="flex flex-col gap-2">
          {members.map((member) => (
            <Card key={member.user_id} className="border-border/50 bg-card">
              <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                <Link href={`/profile/${member.handle}`}>
                  <Avatar className="h-10 w-10 border border-primary/20">
                    {member.avatar_url && (
                      <AvatarImage
                        src={member.avatar_url}
                        alt={member.display_name}
                      />
                    )}
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
                  <p className="text-xs text-muted-foreground">
                    @{member.handle}
                  </p>
                </div>

                <RoleBadge role={member.role} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit club modal */}
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
