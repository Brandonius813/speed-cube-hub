export type DefaultAvatar = {
  id: string
  src: string
  label: string
}

/**
 * Default avatar options users can pick from in the Edit Profile modal.
 * Images live in public/avatars/. To update them, just replace the files —
 * no code changes needed.
 */
export const DEFAULT_AVATARS: DefaultAvatar[] = [
  { id: "default-1", src: "/avatars/default-1.svg", label: "Default 1" },
  { id: "default-2", src: "/avatars/default-2.svg", label: "Default 2" },
  { id: "default-3", src: "/avatars/default-3.svg", label: "Default 3" },
  { id: "default-4", src: "/avatars/default-4.svg", label: "Default 4" },
  { id: "default-5", src: "/avatars/default-5.svg", label: "Default 5" },
]
