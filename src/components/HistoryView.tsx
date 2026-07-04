import { ChevronLeft, Trash2, Play } from 'lucide-react';
import { Activity, SupplyItem } from '../types';

interface Props {
  activity: Activity;
  supplies: SupplyItem[];
  onBack: () => void;
  onUpdate: (activity: Activity) => void;
  onResume: (activity: Activity) => void;
}

export default function HistoryView({ activity, supplies, onBack, onUpdate, onResume }: Props) {
  const sortedRecords = [...activity.records].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  function deleteRecord(id: string) {
    const updated = { ...activity, records: activity.records.filter(r => r.id !== id) };
    onUpdate(updated);
  }

  function handleResume() {
    const updated: Activity = { ...activity, status: 'active' };
    onResume(updated);
  }

  const startMs = activity.startTime ? (() => {
    const [h, m] = activity.startTime!.split(':').map(Number);
    const d = new Date(activity.date);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  })() : null;

  function elapsedFrom(timestamp: string): string {
    if (!startMs) return '';
    const diff = Math.floor((new Date(timestamp).getTime() - startMs) / 60000);
    if (diff < 0) return '';
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (h > 0) return `+${h}:${String(m).padStart(2, '0')}`;
    return `+${m}分`;
  }

  // Per-supply stats
  const supplyStats = activity.carriedSupplies.map(c => {
    const supply = supplies.find(s => s.id === c.supplyId);
    if (!supply) return null;
    const total = activity.records.filter(r => r.supplyId === c.supplyId).reduce((s, r) => s + r.amount, 0);
    const pct = c.carriedAmount > 0 ? Math.min(100, Math.round((total / c.carriedAmount) * 100)) : 0;
    return { supply, carried: c.carriedAmount, total, pct };
  }).filter(Boolean) as { supply: SupplyItem; carried: number; total: number; pct: number }[];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-600"><ChevronLeft size={24} /></button>
        <div className="flex-1">
          <h1 className="text-lg font-bold leading-tight">{activity.name}</h1>
          <div className="text-xs text-gray-500">{activity.date} {activity.startTime && `スタート ${activity.startTime}`}</div>
        </div>
        {activity.status === 'completed' && (
          <button onClick={handleResume}
            className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium">
            <Play size={14} />再開
          </button>
        )}
      </header>

      <div className="p-4 space-y-4">
        {/* Supply summary */}
        {supplyStats.length > 0 && (
          <div className="bg-white rounded-xl p-4">
            <h2 className="font-semibold text-gray-800 mb-3">補給サマリー</h2>
            <div className="space-y-3">
              {supplyStats.map(({ supply, carried, total, pct }) => (
                <div key={supply.id}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{supply.emoji}</span>
                    <span className="font-medium text-sm text-gray-800 flex-1">{supply.name}</span>
                    <span className="text-sm text-gray-500">{total} / {carried}{supply.unit}</span>
                    <span className="text-sm font-semibold" style={{ color: supply.color }}>{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: supply.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold text-gray-800 mb-3">タイムライン</h2>
          {sortedRecords.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-6">記録がありません</p>
          )}
          <div className="space-y-2">
            {sortedRecords.map(record => {
              const supply = supplies.find(s => s.id === record.supplyId);
              if (!supply) return null;
              const time = new Date(record.timestamp);
              const hm = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
              const elapsed = elapsedFrom(record.timestamp);
              return (
                <div key={record.id} className="flex items-center gap-3 py-1.5 border-b last:border-0">
                  <div className="text-center flex-shrink-0 w-14">
                    <div className="text-sm font-mono text-gray-700">{hm}</div>
                    {elapsed && <div className="text-xs text-gray-400">{elapsed}</div>}
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: supply.color + '33' }}>
                    {supply.emoji}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{supply.name}</span>
                    <span className="text-gray-500 text-sm ml-2">{record.amount}{supply.unit}</span>
                  </div>
                  <button onClick={() => deleteRecord(record.id)} className="p-2 text-gray-300 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
