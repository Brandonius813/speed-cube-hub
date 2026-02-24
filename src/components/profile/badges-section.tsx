"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Plus, Shield, ShieldCheck, Trash2 } from "lucide-react";
import { removeBadge, approveBadge } from "@/lib/actions/badges";
import { ClaimBadgeModal } from "@/components/profile/claim-badge-modal";
import type { Badge, UserBadge } from "@/lib/types";

function tierStyles(tier: string, verified: boolean) {
  if (!verified) return "border-border/50 bg-secondary/30 opacity-60";

  switch (tier) {
    case "gold":
      return "border-yellow-500/50 bg-yellow-500/10";
    case "silver":
      return "border-gray-400/50 bg-gray-400/10";
    case "bronze":
      return "border-orange-600/50 bg-orange-600/10";
    default:
      return "border-primary/50 bg-primary/10";
  }
}

function tierIconColor(tier: string) {
  switch (tier) {
    case "gold":
      return "text-yellow-400";
    case "silver":
      return "text-gray-300";
    case "bronze":
      return "text-orange-500";
    default:
      return "text-primary";
  }
}

function CompetitionBadgeItem({
  userBadge,
  isOwner,
  isAdmin,
  onRemove,
  onApprove,
}: {
  userBadge: UserBadge;
  isOwner: boolean;
  isAdmin: boolean;
  onRemove: (id: string) => void;
  onApprove: (id: string) => void;
}) {
  const b = userBadge.badge;

  return (
    <div
      className={`group flex items-center gap-3 rounded-lg border p-3 ${tierStyles(b.tier, userBadge.verified)}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xl">
        {b.icon || "🎖️"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{b.name}</p>
          {!userBadge.verified && (
            <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-medium text-yellow-400">
              Pending
            </span>
          )}
          {userBadge.is_current && (
            <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-medium text-yellow-400">
              Current
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {userBadge.detail}
          {userBadge.year ? `, ${userBadge.year}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        {isAdmin && !userBadge.verified && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onApprove(userBadge.id)}
            className="min-h-8 gap-1 border-green-500/50 text-green-400 hover:bg-green-500/10 hover:text-green-300"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Approve
          </Button>
        )}
        {isOwner && (
          <button
            onClick={() => onRemove(userBadge.id)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
            aria-label="Remove badge"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function SponsorBadgeItem({
  userBadge,
  isOwner,
  onRemove,
}: {
  userBadge: UserBadge;
  isOwner: boolean;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-primary/50 bg-primary/10 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xl">
        💼
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          Sponsored Athlete
        </p>
        <p className="text-sm font-semibold text-primary">
          {userBadge.detail}
        </p>
      </div>
      {isOwner && (
        <button
          onClick={() => onRemove(userBadge.id)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-destructive sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
          aria-label="Remove badge"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function MilestoneBadgeItem({
  userBadge,
}: {
  userBadge: UserBadge;
}) {
  const b = userBadge.badge;

  return (
    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/10 p-3 text-center">
      <span className="text-2xl">{b.icon || "🎯"}</span>
      <p className="text-xs font-medium text-foreground leading-tight">
        {b.name}
      </p>
    </div>
  );
}

export function BadgesSection({
  userBadges: initial,
  allBadges,
  isOwner,
  isAdmin,
}: {
  userBadges: UserBadge[];
  allBadges: Badge[];
  isOwner: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [userBadges, setUserBadges] = useState(initial);
  const [claimOpen, setClaimOpen] = useState(false);

  const competitionBadges = userBadges.filter(
    (ub) => ub.badge.category === "competition"
  );
  const sponsorBadges = userBadges.filter(
    (ub) => ub.badge.category === "sponsor"
  );
  const milestoneBadges = userBadges.filter(
    (ub) => ub.badge.category === "milestone"
  );

  async function handleRemove(userBadgeId: string) {
    const result = await removeBadge(userBadgeId);
    if (result.success) {
      setUserBadges((prev) => prev.filter((ub) => ub.id !== userBadgeId));
      router.refresh();
    }
  }

  async function handleApprove(userBadgeId: string) {
    const result = await approveBadge(userBadgeId);
    if (result.success) {
      setUserBadges((prev) =>
        prev.map((ub) =>
          ub.id === userBadgeId ? { ...ub, verified: true } : ub
        )
      );
      router.refresh();
    }
  }

  function handleBadgeClaimed() {
    setClaimOpen(false);
    router.refresh();
  }

  // If not the owner/admin and there are no badges, don't show the section
  if (!isOwner && !isAdmin && userBadges.length === 0) return null;

  return (
    <>
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Award className="h-5 w-5 text-primary" />
              Badges & Credentials
            </CardTitle>
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setClaimOpen(true)}
                className="min-h-9 gap-1.5 border-border/50"
              >
                <Plus className="h-3.5 w-3.5" />
                Claim Badge
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {userBadges.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No badges earned yet.
              {isOwner &&
                " Log sessions to earn practice milestones, or claim a competition credential!"}
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Competition Credentials */}
              {competitionBadges.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Shield className="h-3.5 w-3.5" />
                    Competition Credentials
                  </h3>
                  <div className="flex flex-col gap-2">
                    {competitionBadges.map((ub) => (
                      <CompetitionBadgeItem
                        key={ub.id}
                        userBadge={ub}
                        isOwner={isOwner}
                        isAdmin={isAdmin}
                        onRemove={handleRemove}
                        onApprove={handleApprove}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Sponsor Badge */}
              {sponsorBadges.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    💼 Sponsorship
                  </h3>
                  <div className="flex flex-col gap-2">
                    {sponsorBadges.map((ub) => (
                      <SponsorBadgeItem
                        key={ub.id}
                        userBadge={ub}
                        isOwner={isOwner}
                        onRemove={handleRemove}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Practice Milestones */}
              {milestoneBadges.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    🎯 Practice Milestones
                  </h3>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {milestoneBadges.map((ub) => (
                      <MilestoneBadgeItem key={ub.id} userBadge={ub} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isOwner && (
        <ClaimBadgeModal
          open={claimOpen}
          onOpenChange={setClaimOpen}
          allBadges={allBadges}
          onClaimed={handleBadgeClaimed}
        />
      )}
    </>
  );
}
