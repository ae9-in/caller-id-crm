import { useState, useCallback, useEffect } from 'react'

/**
 * Generic hook for data fetching with loading, error, and refresh states
 */
export const useApi = (fetchFn, deps = [], immediate = true) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchFn(...args)
      setData(res.data.data)
      return res.data
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred')
      throw err
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => {
    if (immediate) execute()
  }, [execute])

  return { data, loading, error, refetch: execute }
}

/**
 * Hook for paginated list data with search/filter support
 */
export const usePaginatedApi = (fetchFn, initialParams = {}) => {
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [params, setParams] = useState({ page: 1, limit: 20, ...initialParams })

  const fetch = useCallback(async (overrideParams) => {
    setLoading(true)
    setError(null)
    try {
      const finalParams = { ...params, ...overrideParams }
      const res = await fetchFn(finalParams)
      setData(res.data.data || [])
      if (res.data.pagination) setPagination(res.data.pagination)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [params, fetchFn])

  useEffect(() => { fetch() }, [JSON.stringify(params)])

  const updateParams = (updates) => setParams((p) => ({ ...p, page: 1, ...updates }))
  const goToPage = (page) => setParams((p) => ({ ...p, page }))

  return { data, pagination, loading, error, params, updateParams, goToPage, refetch: fetch }
}

/**
 * Debounce hook for search inputs
 */
export const useDebounce = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
