import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Search, Bell, X, CheckCheck, Sun, Moon } from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext'
import { formatRelative } from '../../utils/formatters'
import clsx from 'clsx'

const Header = ({ onMenuClick }) => {
  const navigate = useNavigate()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  const notifRef = useRef(null)

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [theme])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
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
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search businesses, calls, transcripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg
                       placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-slate-50"
          />
        </div>
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
