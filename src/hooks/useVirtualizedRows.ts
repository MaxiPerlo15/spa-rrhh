import { useCallback, useEffect, useMemo, useState, type UIEvent } from 'react'

type UseVirtualizedRowsOptions = {
  enabled: boolean
  totalRows: number
  initialRows?: number
  batchSize?: number
  thresholdPx?: number
}

export function useVirtualizedRows({
  enabled,
  totalRows,
  initialRows = 40,
  batchSize = 30,
  thresholdPx = 120
}: UseVirtualizedRowsOptions) {
  const isVirtualized = enabled && totalRows > initialRows
  const initialVisibleRows = useMemo(
    () => (isVirtualized ? Math.min(initialRows, totalRows) : totalRows),
    [initialRows, isVirtualized, totalRows]
  )
  const [visibleRows, setVisibleRows] = useState(initialVisibleRows)

  useEffect(() => {
    setVisibleRows(initialVisibleRows)
  }, [initialVisibleRows])

  const handleScroll = useCallback(
    (event: UIEvent<HTMLElement>) => {
      if (!isVirtualized) return

      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
      const nearBottom = scrollHeight - (scrollTop + clientHeight) <= thresholdPx
      if (!nearBottom) return

      setVisibleRows((prev) => Math.min(totalRows, prev + batchSize))
    },
    [batchSize, isVirtualized, thresholdPx, totalRows]
  )

  return {
    isVirtualized,
    visibleRows,
    hasMoreRows: visibleRows < totalRows,
    handleScroll
  }
}
