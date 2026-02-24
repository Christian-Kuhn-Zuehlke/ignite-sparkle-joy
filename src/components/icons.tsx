/**
 * Heroicons compatibility layer
 * Re-exports Heroicons (Outline 24px) with Lucide-compatible names.
 * This module is the single source of truth for all icon imports in the app.
 */

// Re-export Heroicons with Lucide-compatible names
export {
  ChartBarSquareIcon as Activity,
  ExclamationCircleIcon as AlertCircle,
  ExclamationTriangleIcon as AlertTriangle,
  ArrowDownIcon as ArrowDown,
  ArrowDownRightIcon as ArrowDownRight,
  ArrowLeftIcon as ArrowLeft,
  ArrowRightIcon as ArrowRight,
  ArrowUpIcon as ArrowUp,
  ArrowsUpDownIcon as ArrowUpDown,
  ArrowUpRightIcon as ArrowUpRight,
  TrophyIcon as Award,
  NoSymbolIcon as Ban,
  ChartBarIcon as BarChart3,
  BellIcon as Bell,
  CpuChipIcon as Bot,
  BriefcaseIcon as Briefcase,
  BugAntIcon as Bug,
  BuildingOffice2Icon as Building2,
  CalendarIcon as Calendar,
  CalendarDaysIcon as CalendarDays,
  CameraIcon as Camera,
  CheckIcon as Check,
  CheckCircleIcon as CheckCircle,
  CheckCircleIcon as CheckCircle2,
  ClipboardDocumentCheckIcon as CheckSquare,
  ChevronDownIcon as ChevronDown,
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight,
  ChevronDoubleLeftIcon as ChevronsLeft,
  ChevronDoubleRightIcon as ChevronsRight,
  ChevronUpIcon as ChevronUp,
  ClockIcon as Clock,
  ClipboardDocumentListIcon as ClipboardList,
  DocumentDuplicateIcon as Copy,
  CpuChipIcon as Cpu,
  CurrencyDollarIcon as DollarSign,
  ArrowDownTrayIcon as Download,
  PencilIcon as Edit2,
  ArrowTopRightOnSquareIcon as ExternalLink,
  EyeIcon as Eye,
  EyeSlashIcon as EyeOff,
  DocumentTextIcon as FileText,
  FunnelIcon as Filter,
  GlobeAltIcon as Globe,
  HashtagIcon as Hash,
  QuestionMarkCircleIcon as HelpCircle,
  HomeIcon as Home,
  InformationCircleIcon as Info,
  KeyIcon as Key,
  Squares2X2Icon as LayoutDashboard,
  LightBulbIcon as Lightbulb,
  LockClosedIcon as Lock,
  ArrowLeftStartOnRectangleIcon as LogOut,
  EnvelopeIcon as Mail,
  MapPinIcon as MapPin,
  Bars3Icon as Menu,
  MinusIcon as Minus,
  MinusCircleIcon as MinusCircle,
  MoonIcon as Moon,
  ArchiveBoxXMarkIcon as PackageX,
  SwatchIcon as Palette,
  PencilSquareIcon as PenTool,
  PercentBadgeIcon as Percent,
  ChartPieIcon as PieChart,
  PaperAirplaneIcon as Plane,
  PlayIcon as Play,
  PlusIcon as Plus,
  ArrowPathIcon as RefreshCw,
  ArrowUturnLeftIcon as RotateCcw,
  DocumentArrowDownIcon as Save,
  MagnifyingGlassIcon as Search,
  Cog6ToothIcon as Settings,
  Cog8ToothIcon as Settings2,
  ShieldCheckIcon as Shield,
  ShieldExclamationIcon as ShieldAlert,
  ShieldCheckIcon as ShieldCheck,
  ShoppingBagIcon as ShoppingBag,
  ShoppingCartIcon as ShoppingCart,
  SparklesIcon as Sparkles,
  StarIcon as Star,
  SunIcon as Sun,
  TagIcon as Tag,
  BeakerIcon as TestTube,
  TrashIcon as Trash2,
  ArrowTrendingDownIcon as TrendingDown,
  ArrowTrendingUpIcon as TrendingUp,
  TrophyIcon as Trophy,
  TruckIcon as Truck,
  ArrowUpTrayIcon as Upload,
  UserIcon as User,
  UserMinusIcon as UserMinus,
  UserPlusIcon as UserPlus,
  UserGroupIcon as Users,
  BuildingStorefrontIcon as Warehouse,
  LinkIcon as Webhook,
  WifiIcon as Wifi,
  WrenchIcon as Wrench,
  XMarkIcon as X,
  XCircleIcon as XCircle,
  BoltIcon as Zap,
} from '@heroicons/react/24/outline';

// Also export ArrowPathIcon directly for Loader2 (used with animate-spin)
export { ArrowPathIcon as Loader2 } from '@heroicons/react/24/outline';
export { PaperAirplaneIcon as Send } from '@heroicons/react/24/outline';

// ============================================
// Custom SVG icons for concepts without direct Heroicons equivalents
// ============================================

import React from 'react';

/** Simple circle outline icon */
export function Circle({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

/** Crown icon (no Heroicons equivalent) */
export function Crown({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 17l3-8 4 4 3-6 3 6 4-4 3 8H2zM4 19h16" />
    </svg>
  );
}

/** Leaf icon (no Heroicons equivalent) */
export function Leaf({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-4-4-8-8-8-13a8 8 0 0116 0c0 5-4 9-8 13z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V10" />
    </svg>
  );
}

/** Mountain icon (no Heroicons equivalent) */
export function Mountain({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 20l5-12 4 6 4-10 5 16H3z" />
    </svg>
  );
}

/** TreePine icon (no Heroicons equivalent) */
export function TreePine({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l-6 8h3l-4 6h5v4h4v-4h5l-4-6h3L12 3z" />
    </svg>
  );
}

/** Target/crosshair icon */
export function Target({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}

/** Brain icon (no direct Heroicons equivalent) */
export function Brain({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a7 7 0 00-5 2.1A5 5 0 003 9c0 1.5.7 2.9 1.7 3.9A6 6 0 003 17a4 4 0 004 4h2v-4m3-15a7 7 0 015 2.1A5 5 0 0121 9c0 1.5-.7 2.9-1.7 3.9A6 6 0 0021 17a4 4 0 01-4 4h-2v-4m-3-15v17" />
    </svg>
  );
}

/** Package icon - maps to CubeIcon but with box-like appearance */
export function Package({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}

/** PackageOpen icon */
export function PackageOpen({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4M4 7l8 4M4 7v10l8 4m0-10v10M8 3l4 2 4-2" />
    </svg>
  );
}

/** PackageCheck icon */
export function PackageCheck({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l2 2 4-4" />
    </svg>
  );
}

/** WifiOff icon (no direct Heroicons equivalent) */
export function WifiOff({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8.11 15.53a6 6 0 017.78 0M4.93 12.47a10 10 0 0114.14 0M1.75 9.41a14 14 0 0120.5 0" />
      <line x1="2" y1="2" x2="22" y2="22" strokeLinecap="round" />
    </svg>
  );
}

// ============================================
// Type compatibility
// ============================================

/** Type alias for icon components - compatible with LucideIcon usage */
export type LucideIcon = React.ComponentType<{ className?: string }>;
export type IconComponent = React.ComponentType<{ className?: string }>;
