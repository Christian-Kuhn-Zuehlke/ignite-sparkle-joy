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
  CubeIcon as Box,
  CubeIcon as Boxes,
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
  ChevronUpDownIcon as ChevronsUpDown,
  ChevronUpIcon as ChevronUp,
  ClockIcon as Clock,
  ClipboardDocumentListIcon as ClipboardList,
  DocumentDuplicateIcon as Copy,
  CpuChipIcon as Cpu,
  CircleStackIcon as Database,
  CurrencyDollarIcon as DollarSign,
  ArrowDownTrayIcon as Download,
  PencilIcon as Edit,
  PencilIcon as Edit2,
  ArrowTopRightOnSquareIcon as ExternalLink,
  EyeIcon as Eye,
  EyeSlashIcon as EyeOff,
  DocumentTextIcon as FileText,
  FunnelIcon as Filter,
  FireIcon as Flame,
  GlobeAltIcon as Globe,
  HashtagIcon as Hash,
  QuestionMarkCircleIcon as HelpCircle,
  HomeIcon as Home,
  InformationCircleIcon as Info,
  KeyIcon as Key,
  LanguageIcon as Languages,
  Squares2X2Icon as LayoutDashboard,
  Square3Stack3DIcon as Layers,
  LightBulbIcon as Lightbulb,
  LinkIcon as Link2,
  LockClosedIcon as Lock,
  ArrowRightOnRectangleIcon as LogIn,
  ArrowLeftStartOnRectangleIcon as LogOut,
  EnvelopeIcon as Mail,
  MapPinIcon as MapPin,
  Bars3Icon as Menu,
  ChatBubbleOvalLeftIcon as MessageCircle,
  ChatBubbleLeftRightIcon as MessageSquare,
  MinusIcon as Minus,
  MinusCircleIcon as MinusCircle,
  MoonIcon as Moon,
  ArchiveBoxXMarkIcon as PackageX,
  SwatchIcon as Palette,
  PencilSquareIcon as PenTool,
  PercentBadgeIcon as Percent,
  PhoneIcon as Phone,
  ChartPieIcon as PieChart,
  EyeDropperIcon as Pipette,
  PaperAirplaneIcon as Plane,
  PlayIcon as Play,
  PlusIcon as Plus,
  ArrowPathIcon as RefreshCw,
  ArrowPathIcon as RotateCw,
  RocketLaunchIcon as Rocket,
  ArrowUturnLeftIcon as RotateCcw,
  DocumentArrowDownIcon as Save,
  ScaleIcon as Scale,
  MagnifyingGlassIcon as Search,
  Cog6ToothIcon as Settings,
  Cog8ToothIcon as Settings2,
  ShieldCheckIcon as Shield,
  ShieldExclamationIcon as ShieldAlert,
  ShieldCheckIcon as ShieldCheck,
  ShoppingBagIcon as ShoppingBag,
  ShoppingCartIcon as ShoppingCart,
  ForwardIcon as SkipForward,
  DevicePhoneMobileIcon as Smartphone,
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
  Bars2Icon as GripVertical,
  ViewColumnsIcon as PanelLeft,
  FolderOpenIcon as FolderOpen,
} from '@heroicons/react/24/outline';

// Separate exports for duplicate base icons
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

/** Crown icon */
export function Crown({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 17l3-8 4 4 3-6 3 6 4-4 3 8H2zM4 19h16" />
    </svg>
  );
}

/** Leaf icon */
export function Leaf({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-4-4-8-8-8-13a8 8 0 0116 0c0 5-4 9-8 13z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V10" />
    </svg>
  );
}

/** Mountain icon */
export function Mountain({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 20l5-12 4 6 4-10 5 16H3z" />
    </svg>
  );
}

/** TreePine icon */
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

/** Brain icon */
export function Brain({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a7 7 0 00-5 2.1A5 5 0 003 9c0 1.5.7 2.9 1.7 3.9A6 6 0 003 17a4 4 0 004 4h2v-4m3-15a7 7 0 015 2.1A5 5 0 0121 9c0 1.5-.7 2.9-1.7 3.9A6 6 0 0021 17a4 4 0 01-4 4h-2v-4m-3-15v17" />
    </svg>
  );
}

/** Package icon */
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

/** WifiOff icon */
export function WifiOff({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8.11 15.53a6 6 0 017.78 0M4.93 12.47a10 10 0 0114.14 0M1.75 9.41a14 14 0 0120.5 0" />
      <line x1="2" y1="2" x2="22" y2="22" strokeLinecap="round" />
    </svg>
  );
}

/** Gauge/speedometer icon */
export function Gauge({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v2M12 14l3-4" />
    </svg>
  );
}

/** Timer/stopwatch icon */
export function Timer({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <circle cx="12" cy="13" r="8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4l2 2M10 2h4M12 2v3" />
    </svg>
  );
}

/** ToggleLeft icon */
export function ToggleLeft({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <rect x="1" y="5" width="22" height="14" rx="7" />
      <circle cx="8" cy="12" r="3" />
    </svg>
  );
}

/** Navigation/compass icon */
export function Navigation({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
  );
}

/** Plug icon */
export function Plug({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 2v6M15 2v6M4 10h16M6 10v4a6 6 0 0012 0v-4M12 18v4" />
    </svg>
  );
}

/** Wand2/magic wand icon */
export function Wand2({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 4l-9 9 3 3 9-9-3-3zM6 13l-4 4M12 3l1 2M19 6l2 1M3 6l2-1M15 19l1 2M19 16l2 1" />
    </svg>
  );
}

/** Keyboard icon */
export function Keyboard({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8" />
    </svg>
  );
}

/** History (clock with arrow) icon */
export function History({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1018 0 9 9 0 00-18 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 12h3M3.5 5l2 2" />
    </svg>
  );
}

/** UserCheck icon */
export function UserCheck({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11l2 2 4-4" />
    </svg>
  );
}

/** PartyPopper icon */
export function PartyPopper({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.8 11.3L2 22l10.7-3.8M4.1 14.8l5.1-5.1M15 3l1 3M18 6l3 1M8 3l.5 2M19 12l2 .5M3 8l2 .5" />
    </svg>
  );
}

/** Ruler icon */
export function Ruler({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21L21 3M8.5 18.5l-3-3M12.5 14.5l-3-3M16.5 10.5l-3-3" />
    </svg>
  );
}

/** ScanLine / barcode scanner icon */
export function ScanLine({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M3 17v2a2 2 0 002 2h2M17 21h2a2 2 0 002-2v-2M5 12h14" />
    </svg>
  );
}

/** Pin icon */
export function Pin({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 17v5M9 10.76a2 2 0 01-1.11-1.7V5a2 2 0 012-2h4.22a2 2 0 012 2v4.06a2 2 0 01-1.11 1.7L12 17l-3-6.24z" />
    </svg>
  );
}

// ============================================
// Type compatibility
// ============================================

/** Type alias for icon components - compatible with LucideIcon usage */
export type LucideIcon = React.ComponentType<{ className?: string }>;
export type IconComponent = React.ComponentType<{ className?: string }>;
