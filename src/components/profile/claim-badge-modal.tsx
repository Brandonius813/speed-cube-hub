"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield } from "lucide-react";
import { claimCompetitionBadge, claimSponsorBadge } from "@/lib/actions/badges";
import type { Badge } from "@/lib/types";

export function ClaimBadgeModal({
  open,
  onOpenChange,
  allBadges,
  onClaimed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allBadges: Badge[];
  onClaimed: () => void;
}) {
  const competitionBadges = allBadges.filter(
    (b) => b.category === "competition"
  );

  // Competition form state
  const [selectedBadgeId, setSelectedBadgeId] = useState("");
  const [year, setYear] = useState("");
  const [detail, setDetail] = useState("");
  const [compSaving, setCompSaving] = useState(false);
  const [compError, setCompError] = useState<string | null>(null);

  // Sponsor form state
  const [sponsorName, setSponsorName] = useState("");
  const [sponsorSaving, setSponsorSaving] = useState(false);
  const [sponsorError, setSponsorError] = useState<string | null>(null);

  function resetForms() {
    setSelectedBadgeId("");
    setYear("");
    setDetail("");
    setCompError(null);
    setSponsorName("");
    setSponsorError(null);
  }

  async function handleClaimCompetition() {
    if (!selectedBadgeId) {
      setCompError("Please select a badge type.");
      return;
    }
    const yearNum = parseInt(year);
    if (!year || isNaN(yearNum) || yearNum < 1982 || yearNum > 2100) {
      setCompError("Please enter a valid year.");
      return;
    }
    if (!detail.trim()) {
      setCompError("Please enter a detail (event name, country, etc.).");
      return;
    }

    setCompSaving(true);
    setCompError(null);

    const result = await claimCompetitionBadge(
      selectedBadgeId,
      yearNum,
      detail.trim()
    );

    if (!result.success) {
      setCompError(result.error ?? "Something went wrong.");
      setCompSaving(false);
      return;
    }

    setCompSaving(false);
    resetForms();
    onClaimed();
  }

  async function handleClaimSponsor() {
    if (!sponsorName.trim()) {
      setSponsorError("Please enter your sponsor name.");
      return;
    }

    setSponsorSaving(true);
    setSponsorError(null);

    const result = await claimSponsorBadge(sponsorName.trim());

    if (!result.success) {
      setSponsorError(result.error ?? "Something went wrong.");
      setSponsorSaving(false);
      return;
    }

    setSponsorSaving(false);
    resetForms();
    onClaimed();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForms();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border/50 bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Claim a Badge
          </DialogTitle>
          <DialogDescription>
            Claim a competition credential or add your sponsor. Competition
            badges require admin approval.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          {/* Competition Credential Section */}
          <div className="rounded-lg border border-border/50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Competition Credential
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="badge-type">Badge Type</Label>
                <Select
                  value={selectedBadgeId}
                  onValueChange={setSelectedBadgeId}
                >
                  <SelectTrigger id="badge-type" className="min-h-11">
                    <SelectValue placeholder="Select a credential..." />
                  </SelectTrigger>
                  <SelectContent>
                    {competitionBadges.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.icon} {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="badge-year">Year</Label>
                <Input
                  id="badge-year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g., 2024"
                  className="min-h-11"
                  min={1982}
                  max={2100}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="badge-detail">
                  Detail{" "}
                  <span className="font-normal text-muted-foreground">
                    (event, country, etc.)
                  </span>
                </Label>
                <Input
                  id="badge-detail"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="e.g., 3x3 — USA"
                  className="min-h-11"
                  maxLength={200}
                />
              </div>

              {compError && (
                <p className="text-sm text-destructive">{compError}</p>
              )}

              <Button
                onClick={handleClaimCompetition}
                disabled={compSaving}
                className="min-h-11 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {compSaving ? "Submitting..." : "Submit for Review"}
              </Button>
            </div>
          </div>

          {/* Sponsor Badge Section */}
          <div className="rounded-lg border border-border/50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Sponsor
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sponsor-name">Sponsor Name</Label>
                <Input
                  id="sponsor-name"
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  placeholder="e.g., SpeedCubeShop"
                  className="min-h-11"
                  maxLength={200}
                />
              </div>

              {sponsorError && (
                <p className="text-sm text-destructive">{sponsorError}</p>
              )}

              <Button
                onClick={handleClaimSponsor}
                disabled={sponsorSaving}
                className="min-h-11 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {sponsorSaving ? "Adding..." : "Add Sponsor Badge"}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="min-h-11"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
