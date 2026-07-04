export type SupplyCategory = 'gel' | 'drink' | 'food' | 'salt' | 'supplement' | 'other';

export interface SupplyItem {
  id: string;
  name: string;
  category: SupplyCategory;
  unit: string;
  defaultAmount: number;
  color: string;
  emoji: string;
}

export interface CarriedSupply {
  supplyId: string;
  carriedAmount: number;
}

export interface IntakeRecord {
  id: string;
  supplyId: string;
  amount: number;
  timestamp: string;
}

export interface MemoRecord {
  id: string;
  text: string;
  timestamp: string;
}

export interface Activity {
  id: string;
  name: string;
  date: string;
  startTime?: string;
  status: 'preparing' | 'active' | 'completed';
  carriedSupplies: CarriedSupply[];
  records: IntakeRecord[];
  memos?: MemoRecord[];
}

export interface AppData {
  supplies: SupplyItem[];
  activities: Activity[];
}
