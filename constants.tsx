import React from 'react';
// --- FLAT KAWAII ICONS (Colorful, No Outlines) ---
type IconProps = { className?: string };

// Logo: Custom Uploaded Logo
export const AmsLogoIcon: React.FC<IconProps> = ({ className }) => (
    <img src="/logo.png" alt="Core Alert Logo" className={`object-contain ${className || ''}`} />
);

// Admin: Blue Shield with Star
export const AdminIcon: React.FC<IconProps> = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none">
        <path d="M12 2L4 5V11C4 16.52 7.4 21.47 12 22C16.6 21.47 20 16.52 20 11V5L12 2Z" fill="#3B82F6" />
        <path d="M12 6L13.5 9.5H17L14 12L15.5 15.5L12 13.5L8.5 15.5L10 12L7 9.5H10.5L12 6Z" fill="#DBEAFE" />
    </svg>
);

// Supervisor: Teal Binoculars
export const EyeIcon: React.FC<IconProps> = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none">
        <circle cx="8" cy="12" r="5" fill="#2DD4BF" />
        <circle cx="16" cy="12" r="5" fill="#2DD4BF" />
        <path d="M8 12L16 12" stroke="#14B8A6" strokeWidth="2" />
        <circle cx="8" cy="12" r="2" fill="#CCFBF1" />
        <circle cx="16" cy="12" r="2" fill="#CCFBF1" />
    </svg>
);

// Technician: Red Toolbox
export const WrenchScrewdriverIcon: React.FC<IconProps> = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none">
        <rect x="3" y="8" width="18" height="12" rx="2" fill="#EF4444" />
        <path d="M8 8V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V8" stroke="#B91C1C" strokeWidth="2" />
        <rect x="10" y="11" width="4" height="2" rx="1" fill="#FECACA" />
    </svg>
);

// Driver: Yellow Forklift
export const ForkliftIcon: React.FC<IconProps> = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none">
        <path d="M5 17H15V10H10L8 14H5V17Z" fill="#F59E0B" />
        <rect x="15" y="6" width="2" height="11" fill="#374151" />
        <rect x="15" y="15" width="6" height="2" fill="#374151" />
        <circle cx="7" cy="17" r="2" fill="#1F2937" />
        <circle cx="13" cy="17" r="2" fill="#1F2937" />
    </svg>
);

// Press Operator: Red Siren
export const PressMachineIcon: React.FC<IconProps> = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none">
         <path d="M6 9C6 5.68629 8.68629 3 12 3C15.3137 3 18 5.68629 18 9V14H6V9Z" fill="#F43F5E" />
         <rect x="5" y="14" width="14" height="4" rx="1" fill="#9F1239" />
         <path d="M18 9L21 6" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" />
         <path d="M6 9L3 6" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" />
         <path d="M14 6L16 4" stroke="#FB7185" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

// --- CATEGORY ICONS ---

export const CogIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="6" fill="#94A3B8" />
      <path d="M12 2V6M12 18V22M2 12H6M18 12H22" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// Electrical: Yellow Bolt
export const BoltIcon: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
        <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
)

// Quality: Blue Ribbon
export const QualityIcon: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
        <circle cx="12" cy="10" r="6" fill="#60A5FA" />
        <path d="M9 14L8 20L12 18L16 20L15 14" fill="#3B82F6" />
        <circle cx="12" cy="10" r="3" fill="#DBEAFE" />
    </svg>
)

// Material: Brown Box
export const BoxIcon: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
        <rect x="4" y="6" width="16" height="14" rx="2" fill="#D97706" />
        <path d="M4 10H20" stroke="#92400E" strokeWidth="2" />
        <path d="M12 10V14" stroke="#FCD34D" strokeWidth="2" />
    </svg>
)

// Generic: Sparkles
export const SparklesIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M12 3L14 9L20 11L14 13L12 19L10 13L4 11L10 9L12 3Z" fill="#818CF8" />
  </svg>
);

// Chart: Bar Graph
export const ChartBarIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="4" y="10" width="4" height="10" rx="1" fill="#34D399" />
      <rect x="10" y="6" width="4" height="14" rx="1" fill="#60A5FA" />
      <rect x="16" y="3" width="4" height="17" rx="1" fill="#F472B6" />
  </svg>
);

// List: Paper
export const ListBulletIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" fill="#F1F5F9" />
      <path d="M8 8H16" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 12H16" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 16H12" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const UserGroupIcon: React.FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
        <circle cx="9" cy="9" r="4" fill="#A78BFA" />
        <circle cx="17" cy="11" r="3" fill="#C4B5FD" />
        <path d="M2 19C2 16 5 15 9 15C13 15 16 16 16 19" fill="#A78BFA" />
    </svg>
);

export const ShieldCheckIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 22C17 20 20 15 20 10V5L12 2L4 5V10C4 15 7 20 12 22Z" fill="#10B981" />
      <path d="M9 11L11 13L15 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const CalendarDaysIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" fill="#FDBA74" />
      <path d="M16 2V6" stroke="#C2410C" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 2V6" stroke="#C2410C" strokeWidth="2" strokeLinecap="round"/>
      <path d="M3 10H21" stroke="#FFF7ED" strokeWidth="2" />
  </svg>
);

export const HomeIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M2 10L12 2L22 10V20C22 21.1 21.1 22 20 22H14V16H10V22H4C2.9 22 2 21.1 2 20V10Z" fill="#60A5FA" />
  </svg>
);

export const ClockIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="9" fill="#E2E8F0" />
      <path d="M12 6V12L16 14" stroke="#64748B" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const ExclamationTriangleIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 3L2 21H22L12 3Z" fill="#F87171" />
      <path d="M12 9V14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="17" r="1.5" fill="white" />
  </svg>
);

export const CheckBadgeIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="10" fill="#34D399" />
      <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ClipboardDocumentListIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" fill="#FCD34D" />
      <rect x="8" y="2" width="8" height="2" rx="1" fill="#D97706" />
      <rect x="8" y="8" width="8" height="2" rx="1" fill="#FFFBEB" />
      <rect x="8" y="12" width="8" height="2" rx="1" fill="#FFFBEB" />
      <rect x="8" y="16" width="6" height="2" rx="1" fill="#FFFBEB" />
  </svg>
);

export const MapPinIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#FB7185" />
      <circle cx="12" cy="9" r="3" fill="white" />
  </svg>
);

export const DocumentChartBarIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M6 2H14L20 8V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V4C4 2.9 4.9 2 6 2Z" fill="#E2E8F0" />
      <path d="M14 2V8H20" fill="#CBD5E1" />
      <rect x="8" y="14" width="2" height="4" fill="#64748B" />
      <rect x="11" y="12" width="2" height="6" fill="#64748B" />
      <rect x="14" y="10" width="2" height="8" fill="#64748B" />
  </svg>
);

export const KeyIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="9" cy="9" r="7" fill="#F472B6" />
      <circle cx="9" cy="9" r="3" fill="#FBCFE8" />
      <path d="M14 14L20 20M20 20H17M20 20V17" stroke="#DB2777" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const BuildingStorefrontIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M2 7L4 2H20L22 7V11H2V7Z" fill="#60A5FA" />
      <rect x="4" y="11" width="16" height="11" fill="#BFDBFE" />
      <rect x="9" y="14" width="6" height="8" fill="#3B82F6" />
  </svg>
);

export const BellIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 2C10.3 2 9 3.3 9 5V6C9 6 6 8 6 13V17L4 19V20H20V19L18 17V13C18 8 15 6 15 6V5C15 3.3 13.7 2 12 2Z" fill="#FBBF24" />
      <path d="M10 21C10 22.1 10.9 23 12 23C13.1 23 14 22.1 14 21H10Z" fill="#D97706" />
  </svg>
);

export const BellSlashIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 2C10.3 2 9 3.3 9 5V6C9 6 6 8 6 13V14M18 17V13C18 8 15 6 15 6V5C15 3.3 13.7 2 12 2Z" stroke="#94A3B8" strokeWidth="2" />
      <path d="M10 21C10 22.1 10.9 23 12 23C13.1 23 14 22.1 14 21H10Z" fill="#94A3B8" />
      <path d="M3 3L21 21" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const UserCircleIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="10" fill="#E2E8F0" />
      <circle cx="12" cy="8" r="4" fill="#94A3B8" />
      <path d="M12 14C8 14 5 16 5 18V20H19V18C19 16 16 14 12 14Z" fill="#94A3B8" />
  </svg>
);

export const WatchIcon: React.FC<IconProps> = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none">
        <rect x="6" y="2" width="12" height="20" rx="4" fill="#334155" />
        <rect x="8" y="5" width="8" height="14" fill="#0F172A" />
        <path d="M8 2L6 5H18L16 2H8Z" fill="#94A3B8" />
        <path d="M8 22L6 19H18L16 22H8Z" fill="#94A3B8" />
    </svg>
);

