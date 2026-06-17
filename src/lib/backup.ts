import { AppState } from "./store";

export const AUTO_BACKUPS_KEY = "brick_auto_backups";
export const EMERGENCY_BACKUP_KEY = "brick_emergency_backup";

export interface AutoBackup {
  timestamp: number;
  reason: string;
  data: AppState;
}

export function createAutoBackup(data: AppState, reason: string): void {
  try {
    const raw = localStorage.getItem(AUTO_BACKUPS_KEY);
    let backups: AutoBackup[] = [];
    if (raw) {
      backups = JSON.parse(raw);
    }

    backups.push({
      timestamp: Date.now(),
      reason,
      data,
    });

    // Sort descending by timestamp (newest first)
    backups.sort((a, b) => b.timestamp - a.timestamp);

    // Keep only the latest 5 backups
    if (backups.length > 5) {
      backups = backups.slice(0, 5);
    }

    localStorage.setItem(AUTO_BACKUPS_KEY, JSON.stringify(backups));
  } catch (error) {
    console.error("[Brick] Failed to create auto backup:", error);
  }
}

export function getAutoBackups(): AutoBackup[] {
  try {
    const raw = localStorage.getItem(AUTO_BACKUPS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (error) {
    console.error("[Brick] Failed to read auto backups:", error);
    return [];
  }
}

export function createEmergencyBackup(data: AppState): void {
  try {
    const backup: AutoBackup = {
      timestamp: Date.now(),
      reason: "Emergency Backup before Restore",
      data,
    };
    localStorage.setItem(EMERGENCY_BACKUP_KEY, JSON.stringify(backup));
  } catch (error) {
    console.error("[Brick] Failed to create emergency backup:", error);
  }
}

export function getEmergencyBackup(): AutoBackup | null {
  try {
    const raw = localStorage.getItem(EMERGENCY_BACKUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error("[Brick] Failed to read emergency backup:", error);
    return null;
  }
}
