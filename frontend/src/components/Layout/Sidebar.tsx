import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Upload, List, BarChart3,
  Film, Zap, Github, Activity
} from 'lucide-react'

const navItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload',    icon: Upload,           label: 'Upload Video' },
  { to: '/videos',    icon: Film,             label: 'Videos' },
  { to: '/jobs',      icon: List,             label: 'Jobs Queue' },
  { to: '/analytics', icon: BarChart3,        label: 'Analytics' },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-50"
      style={{ background: '#0a0d14', borderRight: '1px solid #1c2540' }}>

      {/* Logo */}
      <div className="px-6 py-6 flex items-center gap-3"
        style={{ borderBottom: '1px solid #1c2540' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #3b6ef6, #22d3ee)' }}>
          <Zap size={18} className="text-white" />
        </div>
        <div>
          <div className="font-display font-bold text-white text-sm leading-tight">TranscodeCloud</div>
          <div className="text-xs" style={{ color: '#4a5680' }}>MSc Cloud Computing</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'text-white'
                  : 'hover:text-white'
              }`
            }
            style={({ isActive }) => ({
              background: isActive ? 'rgba(59,110,246,0.15)' : 'transparent',
              color: isActive ? '#e8edf8' : '#8899bb',
              boxShadow: isActive ? 'inset 0 0 0 1px rgba(59,110,246,0.25)' : 'none',
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4" style={{ borderTop: '1px solid #1c2540' }}>
        <div className="text-xs" style={{ color: '#4a5680' }}>
          <div className="font-mono font-medium" style={{ color: '#8899bb' }}>Gaurav Kumar</div>
          <div>Roll No: 24250279</div>
          <div className="mt-1">MSc Cloud Computing</div>
        </div>
      </div>
    </aside>
  )
}
