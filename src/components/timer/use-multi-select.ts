"use client"

import { useCallback, useMemo, useState } from "react"

export function useMultiSelect(totalCount: number) {
  const [isActive, setIsActive] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSelectAll, setIsSelectAll] = useState(false)
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())

  const enter = useCallback((initialId?: string) => {
    setIsActive(true)
    setIsSelectAll(false)
    setExcludedIds(new Set())
    setSelectedIds(initialId ? new Set([initialId]) : new Set())
  }, [])

  const exit = useCallback(() => {
    setIsActive(false)
    setSelectedIds(new Set())
    setIsSelectAll(false)
    setExcludedIds(new Set())
  }, [])

  const toggleSelect = useCallback((id: string) => {
    if (isSelectAll) {
      setExcludedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }
  }, [isSelectAll])

  const toggleSelectAll = useCallback(() => {
    if (isSelectAll) {
      setIsSelectAll(false)
      setExcludedIds(new Set())
      setSelectedIds(new Set())
    } else {
      setIsSelectAll(true)
      setExcludedIds(new Set())
      setSelectedIds(new Set())
    }
  }, [isSelectAll])

  const isSelected = useCallback(
    (id: string) => {
      if (isSelectAll) return !excludedIds.has(id)
      return selectedIds.has(id)
    },
    [isSelectAll, excludedIds, selectedIds]
  )

  const selectedCount = useMemo(() => {
    if (isSelectAll) return totalCount - excludedIds.size
    return selectedIds.size
  }, [isSelectAll, totalCount, excludedIds.size, selectedIds.size])

  return {
    isActive,
    selectedIds,
    isSelectAll,
    excludedIds,
    selectedCount,
    enter,
    exit,
    toggleSelect,
    toggleSelectAll,
    isSelected,
  }
}
