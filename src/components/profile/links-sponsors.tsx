"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ExternalLink,
  Globe,
  Link2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { updateProfileLinks } from "@/lib/actions/profiles"
import type { ProfileLink } from "@/lib/types"

const PLATFORMS = [
  { value: "youtube", label: "YouTube", color: "#EF4444" },
  { value: "instagram", label: "Instagram", color: "#F97316" },
  { value: "tiktok", label: "TikTok", color: "#A855F7" },
  { value: "x", label: "X / Twitter", color: "#6366F1" },
  { value: "discord", label: "Discord", color: "#22D3EE" },
  { value: "wca", label: "WCA", color: "#22D3EE" },
  { value: "website", label: "Website", color: "#8B8BA3" },
] as const

function getPlatformColor(platform: string): string {
  return PLATFORMS.find((p) => p.value === platform)?.color ?? "#6366F1"
}

function getPlatformLabel(platform: string): string {
  return PLATFORMS.find((p) => p.value === platform)?.label ?? platform
}

function PlatformIcon({ platform }: { platform: string }) {
  const color = getPlatformColor(platform)
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
      style={{ backgroundColor: `${color}20` }}
    >
      <Globe className="h-4 w-4" style={{ color }} />
    </div>
  )
}

function LinkForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: ProfileLink
  onSave: (link: ProfileLink) => void
  onCancel: () => void
}) {
  const [platform, setPlatform] = useState(initial?.platform ?? "website")
  const [url, setUrl] = useState(initial?.url ?? "")
  const [label, setLabel] = useState(initial?.label ?? "")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim() || !label.trim()) return
    onSave({ platform, url: url.trim(), label: label.trim() })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-secondary/50 p-3"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="link-platform" className="text-xs">
          Platform
        </Label>
        <select
          id="link-platform"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="min-h-9 rounded-md border border-border/50 bg-background px-3 text-sm text-foreground"
        >
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="link-label" className="text-xs">
          Label
        </Label>
        <Input
          id="link-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="My YouTube Channel"
          className="min-h-9"
          maxLength={50}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="link-url" className="text-xs">
          URL
        </Label>
        <Input
          id="link-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtube.com/@yourchannel"
          className="min-h-9"
          type="url"
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          className="min-h-9 flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {initial ? "Save" : "Add"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="min-h-9 border-border/50"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function LinksSponsors({
  links: initialLinks = [],
  isOwner = false,
}: {
  links?: ProfileLink[]
  isOwner?: boolean
}) {
  const router = useRouter()
  const [links, setLinks] = useState<ProfileLink[]>(initialLinks)
  const [adding, setAdding] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveLinks(newLinks: ProfileLink[]) {
    setSaving(true)
    setError(null)

    const result = await updateProfileLinks(newLinks)
    if (!result.success) {
      setError(result.error ?? "Failed to save links.")
      setSaving(false)
      return false
    }

    setLinks(newLinks)
    setSaving(false)
    router.refresh()
    return true
  }

  async function handleAdd(link: ProfileLink) {
    const ok = await saveLinks([...links, link])
    if (ok) setAdding(false)
  }

  async function handleEdit(index: number, link: ProfileLink) {
    const newLinks = [...links]
    newLinks[index] = link
    const ok = await saveLinks(newLinks)
    if (ok) setEditingIndex(null)
  }

  async function handleDelete(index: number) {
    await saveLinks(links.filter((_, i) => i !== index))
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Link2 className="h-5 w-5 text-accent" />
          Social Links
        </CardTitle>
      </CardHeader>
      <CardContent>
        {links.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground">
            {isOwner
              ? "No links added yet. Add your social profiles below."
              : "No social links yet."}
          </p>
        )}

        <div className="flex flex-col gap-2.5">
          {links.map((link, index) =>
            editingIndex === index ? (
              <LinkForm
                key={index}
                initial={link}
                onSave={(updated) => handleEdit(index, updated)}
                onCancel={() => setEditingIndex(null)}
              />
            ) : (
              <div
                key={index}
                className="group flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/50 p-3"
              >
                <PlatformIcon platform={link.platform} />
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1"
                >
                  <p className="text-sm font-medium text-foreground">
                    {link.label}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {getPlatformLabel(link.platform)}
                  </p>
                </a>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {isOwner && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingIndex(index)}
                      disabled={saving}
                      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      aria-label="Edit link"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(index)}
                      disabled={saving}
                      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Delete link"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )
          )}

          {adding && (
            <LinkForm onSave={handleAdd} onCancel={() => setAdding(false)} />
          )}
        </div>

        {error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}

        {isOwner && !adding && links.length < 10 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAdding(true)}
            disabled={saving}
            className="mt-3 min-h-9 w-full gap-1.5 border-border/50 border-dashed"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Link
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
