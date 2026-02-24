"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select"
import type { WcaCountry } from "@/lib/actions/sor-kinch"

export type RegionSelection = {
  level: "world" | "continent" | "country"
  id?: string
  label: string
}

const CONTINENTS = [
  { id: "_Africa", name: "Africa" },
  { id: "_Asia", name: "Asia" },
  { id: "_Europe", name: "Europe" },
  { id: "_North America", name: "North America" },
  { id: "_Oceania", name: "Oceania" },
  { id: "_South America", name: "South America" },
]

/** Encode a region selection into a single string for the Select value */
function encodeRegion(region: RegionSelection): string {
  if (region.level === "world") return "world"
  return `${region.level}:${region.id}`
}

/** Decode a Select value string back into a RegionSelection */
function decodeRegion(
  value: string,
  countries: WcaCountry[]
): RegionSelection {
  if (value === "world") return { level: "world", label: "World" }

  const [level, id] = value.split(":")
  if (level === "continent") {
    const continent = CONTINENTS.find((c) => c.id === id)
    return { level: "continent", id, label: continent?.name ?? id }
  }

  const country = countries.find((c) => c.id === id)
  return { level: "country", id, label: country?.name ?? id }
}

/** Group countries by continent for the dropdown */
function groupByContinent(
  countries: WcaCountry[]
): Record<string, WcaCountry[]> {
  const groups: Record<string, WcaCountry[]> = {}
  for (const c of countries) {
    if (!groups[c.continent_id]) groups[c.continent_id] = []
    groups[c.continent_id].push(c)
  }
  return groups
}

export function RegionFilter({
  value,
  onChange,
  countries,
}: {
  value: RegionSelection
  onChange: (region: RegionSelection) => void
  countries: WcaCountry[]
}) {
  const grouped = groupByContinent(countries)

  return (
    <Select
      value={encodeRegion(value)}
      onValueChange={(v) => onChange(decodeRegion(v, countries))}
    >
      <SelectTrigger className="h-9 w-[160px] border-border/50 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        <SelectItem value="world">World</SelectItem>

        <SelectGroup>
          <SelectLabel className="text-xs">Continents</SelectLabel>
          {CONTINENTS.map((c) => (
            <SelectItem key={c.id} value={`continent:${c.id}`}>
              {c.name}
            </SelectItem>
          ))}
        </SelectGroup>

        {CONTINENTS.map((continent) => {
          const countryList = grouped[continent.id]
          if (!countryList?.length) return null
          return (
            <SelectGroup key={continent.id}>
              <SelectLabel className="text-xs">{continent.name}</SelectLabel>
              {countryList.map((c) => (
                <SelectItem key={c.id} value={`country:${c.id}`}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )
        })}
      </SelectContent>
    </Select>
  )
}
