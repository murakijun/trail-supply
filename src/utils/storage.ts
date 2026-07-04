import { AppData, SupplyItem, Activity } from '../types';

const STORAGE_KEY = 'supply-manager-data';

const DEFAULT_SUPPLIES: SupplyItem[] = [
  { id: 'preset-gel', name: 'ジェル', category: 'gel', unit: '個', defaultAmount: 1, color: '#f97316', emoji: '🟠' },
  { id: 'preset-water', name: '水', category: 'drink', unit: 'ml', defaultAmount: 200, color: '#3b82f6', emoji: '💧' },
  { id: 'preset-sports', name: 'スポドリ', category: 'drink', unit: 'ml', defaultAmount: 200, color: '#eab308', emoji: '🟡' },
  { id: 'preset-salt', name: '塩タブ', category: 'salt', unit: '個', defaultAmount: 1, color: '#8b5cf6', emoji: '🧂' },
];

const DEFAULT_DATA: AppData = {
  supplies: DEFAULT_SUPPLIES,
  activities: [],
};

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    return JSON.parse(raw) as AppData;
  } catch {
    return DEFAULT_DATA;
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function updateSupplies(supplies: SupplyItem[]): AppData {
  const data = loadData();
  const updated = { ...data, supplies };
  saveData(updated);
  return updated;
}

export function upsertActivity(activity: Activity): AppData {
  const data = loadData();
  const idx = data.activities.findIndex(a => a.id === activity.id);
  const activities = idx >= 0
    ? data.activities.map(a => a.id === activity.id ? activity : a)
    : [activity, ...data.activities];
  const updated = { ...data, activities };
  saveData(updated);
  return updated;
}

export function deleteActivity(id: string): AppData {
  const data = loadData();
  const updated = { ...data, activities: data.activities.filter(a => a.id !== id) };
  saveData(updated);
  return updated;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
