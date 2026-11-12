

export interface Role {
  id: string; // machine-readable name e.g., 'admin', 'custom_operator'
  displayName: string; // human-readable name e.g., 'Administrador', 'Operador Custom'
  isCore: boolean; // if true, cannot be deleted
  requiresAuth: boolean; // if true, path on home page leads to /login?role=...
}

export interface Shift {
  id: string;
  name: string;
}

export interface Area {
    id: string;
    name: string;
}

export interface User {
  id: string;
  username: string;
  role: string; // Role ID
  shiftId?: string; // ID of the shift the user belongs to
  password?: string; // Only for creation/storage, not for frontend display after login
  assignedPressIds?: string[];
  allowedSections?: string[]; // Holds keys for admin sections a supervisor can access
}

export interface Press {
  id: string;
  name: string;
  areaId: string; // Area identifier
  status?: string; // e.g., 'Operational', 'Maintenance' - optional
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  WORKING = 'WORKING',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED',
}

// Emergency alert type: bypasses all role/press filters and triggers the global siren
export const SOS_ALERT_TYPE = 'SOS';

export interface Alert {
  id: string;
  type: string; // Changed from AlertType to string
  status: AlertStatus;
  pressId: string; // ID of the press where the alert originated
  pressName?: string; // Denormalized for display
  areaName?: string; // Denormalized for display
  timestamp: number; // Date.now()
  workingTimestamp?: number; // Date.now() when status changes to WORKING
  resolvedTimestamp?: number;
  notes?: string;
  reportedBy?: string; // User ID or role for quick access roles
  assignedTo?: string; // User ID of technician
}

export interface AlertButtonConfig {
  id:string; // Unique ID for the config item
  name: string; // The type of alert, e.g., "Mecánica"
  order: number;
  enabled: boolean;
  allowedRoles: string[]; // Defines which role IDs can see this alert type
  allowedPressIds?: string[]; // Defines which specific press IDs can see this alert type
}