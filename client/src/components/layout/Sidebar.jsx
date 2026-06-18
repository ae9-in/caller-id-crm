import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Phone, Calendar, BarChart3,
  Trophy, Search, Users, Cpu, FileText, ChevronRight,
  LogOut, Settings, Folder
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { NAV_ITEMS, ADMIN_NAV } from '../../utils/constants'
import clsx from 'clsx'

const ICONS = { LayoutDashboard, Building2, Phone, Calendar, BarChart3, Trophy, Search, Users, Cpu, FileText, Folder }

const NavItem = ({ item, open, index, isAnimating }) => {
  const Icon = ICONS[item.icon]
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        clsx('nav-item sidebar-nav-item', isActive && 'active', !open && 'nav-item-collapsed')
      }
      style={{
        transitionDelay: (open && isAnimating) ? `${index * 25}ms` : '0ms',
      }}
    >
      {Icon && <Icon size={17} className="shrink-0" />}
      <span className="whitespace-nowrap">{item.label}</span>
    </NavLink>
  )
}

const Sidebar = ({ open }) => {
  const { user, logout, isAdmin } = useAuth()
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setIsAnimating(true)
    const timer = setTimeout(() => {
      setIsAnimating(false)
    }, 450)
    return () => clearTimeout(timer)
  }, [open])

  const clientNav = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role))
  const adminNav = isAdmin() ? ADMIN_NAV : (user?.role === 'manager' ? [{ path: '/admin/users', label: 'User Management', icon: 'Users' }] : [])

  return (
    <aside
      className={clsx(
        'fixed lg:static inset-y-0 left-0 z-30 flex flex-col bg-slate-50 dark:bg-zinc-900 sidebar-aside',
        open ? 'w-64 border-r border-slate-200 shadow-md' : 'w-0 overflow-hidden shadow-none'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-200 shrink-0">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
          <Phone size={16} className="text-white" />
        </div>
        <div 
          className="overflow-hidden transition-all sidebar-nav-item"
          style={{
            opacity: open ? 1 : 0,
            transform: open ? 'translateX(0)' : 'translateX(-16px)',
            transitionDelay: (open && isAnimating) ? '120ms' : '0ms'
          }}
        >
          <p className="font-bold text-slate-900 text-sm leading-tight whitespace-nowrap">CallerID</p>
          <p className="text-xs text-slate-400 whitespace-nowrap">CRM</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-0.5">
        {clientNav.map((item, idx) => (
          <NavItem key={item.path} item={item} open={open} index={idx} isAnimating={isAnimating} />
        ))}

        {(isAdmin() || user?.role === 'manager') && (
          <>
            <div className="pt-4 pb-2 px-3">
              <p 
                className="text-xs font-semibold text-slate-400 uppercase tracking-wider sidebar-nav-item"
                style={{
                  opacity: open ? 1 : 0,
                  transform: open ? 'translateX(0)' : 'translateX(-16px)',
                  transitionDelay: (open && isAnimating) ? `${clientNav.length * 25}ms` : '0ms'
                }}
              >
                Admin
              </p>
            </div>
            {adminNav.map((item, idx) => (
              <NavItem 
                key={item.path} 
                item={item} 
                open={open} 
                index={clientNav.length + 1 + idx} 
                isAnimating={isAnimating}
              />
            ))}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-200 p-3 shrink-0">
        <NavLink
          to="/profile"
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-800/40 cursor-pointer group sidebar-nav-item"
          style={{
            opacity: open ? 1 : 0,
            transform: open ? 'translateX(0)' : 'translateX(-16px)',
            transitionDelay: (open && isAnimating) ? `${(clientNav.length + adminNav.length + 1) * 25}ms` : '0ms'
          }}
        >
          <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-brand-700 font-bold text-xs">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-sm font-medium text-slate-800 truncate whitespace-nowrap">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
          </div>
        </NavLink>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 text-sm mt-1 transition-colors sidebar-nav-item"
          style={{
            opacity: open ? 1 : 0,
            transform: open ? 'translateX(0)' : 'translateX(-16px)',
            transitionDelay: (open && isAnimating) ? `${(clientNav.length + adminNav.length + 2) * 25}ms` : '0ms'
          }}
        >
          <LogOut size={16} className="shrink-0" />
          <span className="whitespace-nowrap">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
