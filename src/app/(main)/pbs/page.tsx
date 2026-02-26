import { redirect } from "next/navigation"

export default function PBsPage() {
  redirect("/profile?tab=pbs")
}
