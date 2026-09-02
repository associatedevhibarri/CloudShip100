import {
  Sun,
  Headset,
  Sparkles,
  Coins,
  Languages,
  MapPinned,
  Shield,
  MessageSquare,
  Settings,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const icons = [
  { icon: Sun, label: 'Theme', to: '/app/dashboard' },
  { icon: Headset, label: 'Support', to: '/app/notifications' },
  { icon: Sparkles, label: 'AI', to: '/app/geo-analytics' },
  { icon: Coins, label: 'Wallet', to: '/app/wallet' },
  { icon: Languages, label: 'Locale', to: '/app/dashboard' },
  { icon: MapPinned, label: 'Tracking', to: '/app/map' },
  { icon: Shield, label: 'Compliance', to: '/app/assets/vehicles' },
  { icon: MessageSquare, label: 'Messages', to: '/app/notifications' },
  { icon: Settings, label: 'Settings', to: '/app/dashboard' },
]

export function IconRail() {
  return (
    <aside className="hidden w-16 shrink-0 flex-col items-center gap-3 border-l border-line bg-white py-4 xl:flex">
      {icons.map(({ icon: Icon, label, to }) => (
        <Link
          key={label}
          to={to}
          title={label}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted transition hover:border-brand hover:bg-brand-light hover:text-brand"
        >
          <Icon size={18} />
        </Link>
      ))}
    </aside>
  )
}
