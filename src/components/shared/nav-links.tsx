import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function isNavbarLinkActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(href + "/")
}

export function navbarLinkClass(isActive: boolean) {
  return cn(
    "flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors sm:min-h-0 sm:min-w-0",
    isActive
      ? "text-foreground"
      : "text-muted-foreground hover:text-foreground"
  )
}

export function navbarIconClass(isActive: boolean) {
  return cn("h-5 w-5", isActive && "text-foreground")
}

export function navbarTextClass(isActive: boolean) {
  return cn(
    "hidden text-sm font-semibold sm:inline",
    isActive && "border-b-2 border-primary pb-0.5"
  )
}

export function NavbarNavLink({
  href,
  pathname,
  label,
  icon: Icon,
  ariaLabel,
  activeOverride,
}: {
  href: string
  pathname: string
  label: string
  icon: LucideIcon
  ariaLabel?: string
  activeOverride?: boolean
}) {
  const isActive = activeOverride ?? isNavbarLinkActive(pathname, href)

  return (
    <Link
      href={href}
      className={navbarLinkClass(isActive)}
      aria-label={ariaLabel ?? label}
    >
      <Icon className={cn(navbarIconClass(isActive), "sm:hidden")} />
      <span className={navbarTextClass(isActive)}>{label}</span>
    </Link>
  )
}
