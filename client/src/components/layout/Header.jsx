import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { Menu, Search, Bell, X, CheckCheck, Sun, Moon, Clock, Trash2, Phone, Building2, FileText } from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext'
import { searchService } from '../../services/index'
import { formatRelative } from '../../utils/formatters'
import clsx from 'clsx'

const Header = ({ onMenuClick }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  const notifRef = useRef(null)
  const searchRef = useRef(null)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [recentSearches, setRecentSearches] = useState([])
  const [quickResults, setQuickResults] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [theme])

  // Load search history on mount
  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem('recent_searches') || '[]')
      setRecentSearches(history)
    } catch {}
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Debounced search for Quick Results dropdown list
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setQuickResults(null)
      return
    }
    setSearchLoading(true)
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await searchService.search(searchQuery.trim())
        setQuickResults(res.data.data)
      } catch (err) {
        console.error(err)
      } finally {
        setSearchLoading(false)
      }
    }, 300)
    return () => clearTimeout(delayDebounce)
  }, [searchQuery])

  const executeSearch = (qStr) => {
    const trimmed = qStr.trim()
    if (!trimmed) return
    
    // Save to history
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase())
      const newHistory = [trimmed, ...filtered].slice(0, 5)
      localStorage.setItem('recent_searches', JSON.stringify(newHistory))
      return newHistory
    })

    navigate(`/search?q=${encodeURIComponent(trimmed)}`)
    setSearchQuery('')
    setShowSearchDropdown(false)
  }

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      executeSearch(searchQuery)
    }
  }

  const clearHistory = (e) => {
    e.stopPropagation()
    localStorage.removeItem('recent_searches')
    setRecentSearches([])
  }

  const removeHistoryItem = (e, itemToRemove) => {
    e.stopPropagation()
    setRecentSearches(prev => {
      const newHistory = prev.filter(item => item !== itemToRemove)
      localStorage.setItem('recent_searches', JSON.stringify(newHistory))
      return newHistory
    })
  }

  return (
    <header className="h-16 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center px-6 gap-4 shrink-0">
      {/* Menu toggle */}
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Global search */}
      <div className="flex-1 max-w-md relative" ref={searchRef}>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search businesses, calls, transcripts..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowSearchDropdown(true) }}
            onFocus={() => setShowSearchDropdown(true)}
            onKeyDown={handleSearch}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg
                       placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-slate-50 dark:focus:bg-zinc-800/40"
          />
        </div>

        {/* Search dropdown */}
        {showSearchDropdown && (
          <div className="absolute top-11 left-0 w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg z-50 py-2 dropdown-bounce text-slate-800 dark:text-zinc-100">
            {/* If query length is less than 2, show Recent Searches */}
            {searchQuery.trim().length < 2 ? (
              <div>
                <div className="flex items-center justify-between px-3.5 py-1 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                  <span>Recent Searches</span>
                  {recentSearches.length > 0 && (
                    <button onClick={clearHistory} className="text-[10px] text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer normal-case font-medium">
                      <Trash2 size={11} /> Clear all
                    </button>
                  )}
                </div>
                {recentSearches.length === 0 ? (
                  <div className="px-3.5 py-3 text-xs text-slate-400 dark:text-zinc-500 italic">
                    No recent searches. Try searching for "Adharsh" or "meeting".
                  </div>
                ) : (
                  <div className="mt-1">
                    {recentSearches.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => executeSearch(item)}
                        className="flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800/40 cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300">
                          <Clock size={13} className="text-slate-400" />
                          <span>{item}</span>
                        </div>
                        <button
                          onClick={(e) => removeHistoryItem(e, item)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-0.5 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Quick results view
              <div>
                {searchLoading ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-xs text-slate-400 dark:text-zinc-500">
                    <span className="flex items-center gap-0.5 h-3">
                      <span className="w-0.5 h-2 bg-current rounded-full animate-soundwave-sm-1" />
                      <span className="w-0.5 h-3 bg-current rounded-full animate-soundwave-sm-2" />
                      <span className="w-0.5 h-2 bg-current rounded-full animate-soundwave-sm-3" />
                    </span>
                    <span>Searching CRM...</span>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto scrollbar-thin">
                    {/* Businesses */}
                    {quickResults?.businesses?.length > 0 && (
                      <div className="border-b border-slate-100 dark:border-zinc-800/60 pb-1.5 mb-1.5">
                        <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                          <Building2 size={11} />
                          <span>Businesses</span>
                        </div>
                        {quickResults.businesses.slice(0, 3).map(b => (
                          <Link
                            key={b.id}
                            to={`/businesses/${b.id}`}
                            onClick={() => executeSearch(b.name)}
                            className="flex items-center justify-between px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800/40 text-xs"
                          >
                            <span className="font-medium text-slate-800 dark:text-zinc-200 truncate max-w-[180px]">{b.name}</span>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 capitalize">{b.status.replace('_', ' ')}</span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Calls */}
                    {quickResults?.calls?.length > 0 && (
                      <div className="border-b border-slate-100 dark:border-zinc-800/60 pb-1.5 mb-1.5">
                        <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                          <Phone size={11} />
                          <span>Calls</span>
                        </div>
                        {quickResults.calls.slice(0, 3).map(c => (
                          <Link
                            key={c.id}
                            to={`/calls/${c.id}`}
                            state={{ from: location.pathname + location.search }}
                            onClick={() => executeSearch(c.title)}
                            className="flex items-center justify-between px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800/40 text-xs"
                          >
                            <span className="font-medium text-slate-800 dark:text-zinc-200 truncate max-w-[180px]">{c.title}</span>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500">{c.status}</span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Transcripts */}
                    {quickResults?.transcripts?.length > 0 && (
                      <div className="border-b border-slate-100 dark:border-zinc-800/60 pb-1.5 mb-1.5">
                        <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                          <FileText size={11} />
                          <span>Transcripts Snippets</span>
                        </div>
                        {quickResults.transcripts.slice(0, 2).map(t => (
                          <Link
                            key={t.id}
                            to={`/calls/${t.id}`}
                            state={{ from: location.pathname + location.search }}
                            onClick={() => executeSearch(t.call_title)}
                            className="block px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800/40 text-xs text-left"
                          >
                            <p className="font-medium text-slate-800 dark:text-zinc-200 truncate">{t.call_title}</p>
                            {t.snippet && <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate italic mt-0.5">"...{t.snippet.replace(/<\/?b>/g, '')}..."</p>}
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* No results */}
                    {(!quickResults || Object.values(quickResults).every(arr => !arr?.length)) && (
                      <div className="px-3.5 py-4 text-center text-xs text-slate-400 dark:text-zinc-500">
                        No quick results matching "{searchQuery}"
                      </div>
                    )}

                    {/* General search trigger */}
                    <div
                      onClick={() => executeSearch(searchQuery)}
                      className="flex items-center gap-2 px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-zinc-800/60 cursor-pointer text-xs text-brand-600 dark:text-brand-400 border-t border-slate-100 dark:border-zinc-800/60 font-semibold"
                    >
                      <Search size={12} />
                      <span>Search all results for "{searchQuery}"</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={20} className="text-amber-500 animate-pulse" /> : <Moon size={20} />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-72 bg-white dark:bg-zinc-900 rounded-2xl shadow-md border border-slate-200 dark:border-zinc-800 z-50 dropdown-bounce">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-zinc-800/60">
                <span className="font-semibold text-slate-800 text-xs">Notifications</span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[11px] text-brand-600 hover:text-brand-700 flex items-center gap-1">
                      <CheckCheck size={11} /> Mark all
                    </button>
                  )}
                  <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600 p-0.5">
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto scrollbar-thin">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => { markRead(n.id); if (n.link) navigate(n.link) }}
                      className="px-3 py-2 border-b border-slate-100 dark:border-zinc-800/60 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        {!n.is_read && <div className="w-1.5 h-1.5 bg-brand-500 rounded-full mt-1.5 shrink-0" />}
                        <div className={clsx('flex-1', n.is_read && 'ml-2.5')}>
                          <p className="text-xs font-semibold text-slate-800 dark:text-zinc-100">{n.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{formatRelative(n.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
