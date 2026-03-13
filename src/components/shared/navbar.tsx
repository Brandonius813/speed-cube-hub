import { getNavbarData } from "@/lib/actions/auth"
import { NavbarClient } from "@/components/shared/navbar-client"

export async function Navbar() {
  const initialData = await getNavbarData()
  return <NavbarClient initialData={initialData} />
}
