import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search, Building2, Phone, Calendar, FileText, StickyNote } from 'lucide-react'
import { searchService } from '../../services/index'
import { PageHeader, LoadingState, Card, SearchInput, Badge } from '../../components/ui/index'
import { formatDate, getStatusColor, getStatusLabel } from '../../utils/formatters'
import { useDebounce } from '../../hooks/index'

const ResultSection = ({ title, icon: Icon, results, renderItem }) => {
  if (!results?.length) return null
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className="text-slate-500" />
        <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
        <span className="text-xs text-slate-400">({results.length})</span>
      </div>
      <div className="space-y-2">
        {results.map((item, i) => <div key={i}>{renderItem(item)}</div>)}
      </div>
    </div>
  )
}

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const debouncedQuery = useDebounce(query, 500)

  useEffect(() => {
    if (debouncedQuery.length < 2) { setResults(null); return }
    setLoading(true)
    searchService.search(debouncedQuery)
      .then((r) => setResults(r.data.data))
      .catch(() => setResults(null))
      .finally(() => setLoading(false))
    setSearchParams({ q: debouncedQuery })
  }, [debouncedQuery])

  const totalResults = results
    ? Object.values(results).reduce((sum, arr) => sum + (arr?.length || 0), 0)
    : 0

  return (
    <div className="max-w-3xl mx-auto space-y-5 fade-in">
      <PageHeader title="Global Search" description="Search across all businesses, calls, transcripts, and more" />

      <SearchInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search everything..."
        className="text-base"
      />

      {loading && <LoadingState message="Searching..." />}

      {!loading && results && (
        <>
          <p className="text-sm text-slate-500">
            {totalResults > 0 ? `Found ${totalResults} result${totalResults !== 1 ? 's' : ''} for "${debouncedQuery}"` : `No results for "${debouncedQuery}"`}
          </p>

          <Card className="p-5 space-y-6">
            <ResultSection
              title="Businesses"
              icon={Building2}
              results={results.businesses}
              renderItem={(b) => (
                <Link to={`/businesses/${b.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-brand-200 transition-colors">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{b.name}</p>
                    <p className="text-xs text-slate-400">{b.contact_person}</p>
                  </div>
                  <Badge variant={getStatusColor(b.status).replace('badge-', '')}>{getStatusLabel(b.status)}</Badge>
                </Link>
              )}
            />

            <ResultSection
              title="Calls"
              icon={Phone}
              results={results.calls}
              renderItem={(c) => (
                <Link to={`/calls/${c.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-brand-200 transition-colors">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{c.title}</p>
                    <p className="text-xs text-slate-400">{c.business_name} · {formatDate(c.call_date)}</p>
                  </div>
                  <Badge variant={getStatusColor(c.status).replace('badge-', '')}>{getStatusLabel(c.status)}</Badge>
                </Link>
              )}
            />

            <ResultSection
              title="Transcripts"
              icon={FileText}
              results={results.transcripts}
              renderItem={(t) => (
                <Link to={`/calls/${t.id}`}
                  className="p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-brand-200 block transition-colors">
                  <p className="font-medium text-slate-800 text-sm mb-1">{t.call_title}</p>
                  {t.business_name && <p className="text-xs text-slate-400 mb-1">{t.business_name}</p>}
                  {t.snippet && <p className="text-xs text-slate-600 italic">...{t.snippet}...</p>}
                </Link>
              )}
            />

            <ResultSection
              title="Follow Ups"
              icon={Calendar}
              results={results.followups}
              renderItem={(f) => (
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{f.title}</p>
                    <p className="text-xs text-slate-400">{f.business_name} · Due {formatDate(f.due_date)}</p>
                  </div>
                  <Badge variant={getStatusColor(f.status).replace('badge-', '')}>{getStatusLabel(f.status)}</Badge>
                </div>
              )}
            />

            <ResultSection
              title="Notes"
              icon={StickyNote}
              results={results.notes}
              renderItem={(n) => (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-sm text-slate-700">{n.content}</p>
                  <p className="text-xs text-slate-400 mt-1">{n.business_name} · {formatDate(n.created_at)}</p>
                </div>
              )}
            />

            {totalResults === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Search size={40} className="mx-auto mb-3 opacity-30" />
                <p>No results found. Try a different search term.</p>
              </div>
            )}
          </Card>
        </>
      )}

      {!loading && !results && query.length < 2 && (
        <div className="text-center py-12 text-slate-400">
          <Search size={48} className="mx-auto mb-3 opacity-30" />
          <p>Type at least 2 characters to search</p>
          <p className="text-xs mt-1">Searches businesses, calls, transcripts, notes, and follow-ups</p>
        </div>
      )}
    </div>
  )
}

export default SearchPage
