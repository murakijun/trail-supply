import { useState, useEffect, useRef } from 'react';
import { Square, Clock } from 'lucide-react';
import { Activity, SupplyItem, IntakeRecord } from '../types';
import { generateId } from '../utils/storage';

interface Props {
  activity: Activity;
  supplies: SupplyItem[];
  onUpdate: (activity: Activity) => void;
  onFinish: (activity: Activity) => void;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function minutesAgo(timestamp: string): string {
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
  if (diff === 0) return 'たった今';
  return `${diff}分前`;
}

export default function RaceMode({ activity, supplies, onUpdate, onFinish }: Props) {
  const [records, setRecords] = useState<IntakeRecord[]>(activity.records);
  const [elapsed, setElapsed] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [amountDialog, setAmountDialog] = useState<{ supply: SupplyItem } | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tick, setTick] = useState(0);

  // Start time
  const startMs = useRef<number>((() => {
    if (activity.startTime) {
      const [h, m] = activity.startTime.split(':').map(Number);
      const d = new Date(activity.date);
      d.setHours(h, m, 0, 0);
      return d.getTime();
    }
    return Date.now();
  })());

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Date.now() - startMs.current);
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const carriedSupplies = activity.carriedSupplies
    .map(c => ({ carried: c, supply: supplies.find(s => s.id === c.supplyId) }))
    .filter((x): x is { carried: typeof x.carried; supply: SupplyItem } => !!x.supply);

  function addRecord(supply: SupplyItem, amount: number) {
    const record: IntakeRecord = {
      id: generateId(),
      supplyId: supply.id,
      amount,
      timestamp: new Date().toISOString(),
    };
    const newRecords = [...records, record];
    setRecords(newRecords);
    const updated: Activity = { ...activity, records: newRecords };
    onUpdate(updated);
  }

  function handleTap(supply: SupplyItem) {
    addRecord(supply, supply.defaultAmount);
  }

  function handleLongPressStart(supply: SupplyItem) {
    longPressTimer.current = setTimeout(() => {
      setAmountDialog({ supply });
      setCustomAmount(String(supply.defaultAmount));
    }, 500);
  }

  function handleLongPressEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function confirmFinish() {
    const updated: Activity = { ...activity, records, status: 'completed' };
    onFinish(updated);
  }

  const recentRecords = [...records].reverse().slice(0, 5);

  function lastIntake(supplyId: string): string | null {
    const found = [...records].reverse().find(r => r.supplyId === supplyId);
    return found ? found.timestamp : null;
  }

  function totalIntake(supplyId: string): number {
    return records.filter(r => r.supplyId === supplyId).reduce((s, r) => s + r.amount, 0);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col select-none">
      {/* Header */}
      <header className="px-4 pt-4 pb-2 flex items-center gap-3 bg-gray-900">
        <div className="flex-1">
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">{activity.name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <Clock size={16} className="text-green-400" />
            <span className="text-2xl font-mono font-bold text-green-400">{formatElapsed(elapsed)}</span>
          </div>
        </div>
        <button onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 bg-red-600 px-4 py-2 rounded-xl font-semibold text-sm">
          <Square size={16} />終了
        </button>
      </header>

      {/* Supply buttons */}
      <div className="flex-1 px-3 py-2 grid grid-cols-2 gap-3 content-start overflow-y-auto">
        {carriedSupplies.length === 0 && (
          <div className="col-span-2 text-center text-gray-500 py-12">
            持参補給がありません
          </div>
        )}
        {carriedSupplies.map(({ carried, supply }) => {
          const last = lastIntake(supply.id);
          const total = totalIntake(supply.id);
          const pct = carried.carriedAmount > 0 ? Math.min(100, Math.round((total / carried.carriedAmount) * 100)) : 0;
          return (
            <button
              key={supply.id}
              onTouchStart={() => handleLongPressStart(supply)}
              onTouchEnd={() => { handleLongPressEnd(); }}
              onMouseDown={() => handleLongPressStart(supply)}
              onMouseUp={() => { handleLongPressEnd(); handleTap(supply); }}
              onContextMenu={e => { e.preventDefault(); }}
              className="rounded-2xl p-4 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
              style={{ backgroundColor: supply.color, minHeight: '110px' }}
            >
              <span className="text-4xl leading-none">{supply.emoji}</span>
              <span className="font-bold text-base leading-tight text-center">{supply.name}</span>
              <span className="text-xs opacity-80">{supply.defaultAmount}{supply.unit}/タップ</span>
              {last && (
                <span className="text-xs opacity-70 mt-0.5">{minutesAgo(last)}</span>
              )}
              {/* consumption bar */}
              <div className="w-full mt-1 bg-black/20 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-white/70 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs opacity-60">{total}/{carried.carriedAmount}{supply.unit}</span>
            </button>
          );
        })}
      </div>

      {/* Recent records */}
      {recentRecords.length > 0 && (
        <div className="bg-gray-800 px-4 py-3">
          <div className="text-xs text-gray-400 mb-2 font-medium">直近の記録</div>
          <div className="space-y-1">
            {recentRecords.map(r => {
              const supply = supplies.find(s => s.id === r.supplyId);
              if (!supply) return null;
              const time = new Date(r.timestamp);
              const hm = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
              return (
                <div key={r.id} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 font-mono text-xs w-12">{hm}</span>
                  <span>{supply.emoji}</span>
                  <span className="text-gray-200">{supply.name}</span>
                  <span className="text-gray-400">{r.amount}{supply.unit}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Finish confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
          <div className="bg-white text-gray-900 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-2">レースを終了しますか？</h2>
            <p className="text-gray-500 text-sm mb-6">記録は保存されます。後から確認できます。</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 border rounded-xl font-medium">キャンセル</button>
              <button onClick={confirmFinish} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold">終了する</button>
            </div>
          </div>
        </div>
      )}

      {/* Amount dialog */}
      {amountDialog && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="bg-white text-gray-900 w-full rounded-t-2xl p-5">
            <h2 className="text-lg font-bold mb-1">{amountDialog.supply.emoji} {amountDialog.supply.name}</h2>
            <p className="text-sm text-gray-500 mb-4">量を選択してください</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: `半分 (${amountDialog.supply.defaultAmount / 2}${amountDialog.supply.unit})`, val: amountDialog.supply.defaultAmount / 2 },
                { label: `1個 (${amountDialog.supply.defaultAmount}${amountDialog.supply.unit})`, val: amountDialog.supply.defaultAmount },
                { label: `2個 (${amountDialog.supply.defaultAmount * 2}${amountDialog.supply.unit})`, val: amountDialog.supply.defaultAmount * 2 },
              ].map(opt => (
                <button key={opt.val} onClick={() => { addRecord(amountDialog.supply, opt.val); setAmountDialog(null); }}
                  className="py-3 border-2 rounded-xl font-medium text-sm border-gray-200 hover:border-blue-500 hover:bg-blue-50">
                  {opt.label}
                </button>
              ))}
              <div className="flex gap-2 items-center col-span-1">
                <input
                  type="number"
                  value={customAmount}
                  onChange={e => setCustomAmount(e.target.value)}
                  className="flex-1 border-2 rounded-xl px-2 py-2 text-center text-sm"
                  min={0}
                  placeholder="カスタム"
                />
                <span className="text-sm text-gray-500 flex-shrink-0">{amountDialog.supply.unit}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAmountDialog(null)} className="flex-1 py-3 border rounded-xl font-medium">キャンセル</button>
              <button onClick={() => {
                const v = parseFloat(customAmount);
                if (v > 0) { addRecord(amountDialog.supply, v); setAmountDialog(null); }
              }} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold">
                記録
              </button>
            </div>
          </div>
        </div>
      )}

      {/* suppress unused tick warning */}
      <span className="hidden">{tick}</span>
    </div>
  );
}
