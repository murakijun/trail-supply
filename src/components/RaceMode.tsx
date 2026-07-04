import { useState, useEffect, useRef } from 'react';
import { Square, Clock, Plus, X, NotebookPen } from 'lucide-react';
import { Activity, SupplyItem, IntakeRecord, MemoRecord } from '../types';
import { generateId } from '../utils/storage';

interface Props {
  activity: Activity;
  supplies: SupplyItem[];
  onUpdate: (activity: Activity) => void;
  onFinish: (activity: Activity) => void;
  onAddSupply: (supply: SupplyItem) => void;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function elapsedSince(timestamp: string): string {
  const totalSec = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (totalSec < 5) return 'たった今';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} 前`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} 前`;
}

export default function RaceMode({ activity, supplies, onUpdate, onFinish, onAddSupply }: Props) {
  const [records, setRecords] = useState<IntakeRecord[]>(activity.records);
  const [elapsed, setElapsed] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [amountDialog, setAmountDialog] = useState<{ supply: SupplyItem } | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [aidDialog, setAidDialog] = useState(false);
  const [adhocName, setAdhocName] = useState('');
  const [adhocAmount, setAdhocAmount] = useState('');
  const [adhocUnit, setAdhocUnit] = useState('個');
  const [undoRecord, setUndoRecord] = useState<{ record: IntakeRecord; supply: SupplyItem } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [memoDialog, setMemoDialog] = useState(false);
  const [memoText, setMemoText] = useState('');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tick, setTick] = useState(0);

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
    const alreadyCarried = activity.carriedSupplies.some(c => c.supplyId === supply.id);
    const newCarried = alreadyCarried
      ? activity.carriedSupplies
      : [...activity.carriedSupplies, { supplyId: supply.id, carriedAmount: 0 }];
    onUpdate({ ...activity, records: newRecords, carriedSupplies: newCarried });

    // 取り消しトーストを表示（4秒で自動消え）
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoRecord({ record, supply });
    undoTimer.current = setTimeout(() => setUndoRecord(null), 4000);
  }

  function handleUndo() {
    if (!undoRecord) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    const newRecords = records.filter(r => r.id !== undoRecord.record.id);
    setRecords(newRecords);
    onUpdate({ ...activity, records: newRecords });
    setUndoRecord(null);
  }

  function saveMemo() {
    const text = memoText.trim();
    if (!text) return;
    const memo: MemoRecord = { id: generateId(), text, timestamp: new Date().toISOString() };
    const newMemos = [...(activity.memos ?? []), memo];
    onUpdate({ ...activity, records, memos: newMemos });
    setMemoText('');
    setMemoDialog(false);
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

  function openAmountDialog(supply: SupplyItem) {
    setAidDialog(false);
    setAmountDialog({ supply });
    setCustomAmount(String(supply.defaultAmount));
  }

  function recordAdhoc() {
    const name = adhocName.trim();
    const amount = parseFloat(adhocAmount);
    if (!name || !(amount > 0)) return;
    const newSupply: SupplyItem = {
      id: generateId(),
      name,
      category: 'other',
      unit: adhocUnit.trim() || '個',
      defaultAmount: amount,
      color: '#6b7280',
      emoji: '🍴',
    };
    onAddSupply(newSupply);
    addRecord(newSupply, amount);
    setAdhocName('');
    setAdhocAmount('');
    setAdhocUnit('個');
    setAidDialog(false);
  }

  function confirmFinish() {
    onFinish({ ...activity, records, status: 'completed' });
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
        <button onClick={() => setMemoDialog(true)}
          className="p-2 text-gray-400 active:text-white">
          <NotebookPen size={22} />
        </button>
        <button onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 bg-red-600 px-4 py-2 rounded-xl font-semibold text-sm">
          <Square size={16} />終了
        </button>
      </header>

      {/* Supply buttons */}
      <div className="flex-1 px-3 py-2 grid grid-cols-2 gap-3 content-start overflow-y-auto">
        {carriedSupplies.length === 0 && (
          <div className="col-span-2 text-center text-gray-500 py-8">
            持参補給がありません
          </div>
        )}
        {carriedSupplies.map(({ carried, supply }) => {
          const last = lastIntake(supply.id);
          const total = totalIntake(supply.id);
          const isAid = carried.carriedAmount === 0;
          const pct = !isAid ? Math.min(100, Math.round((total / carried.carriedAmount) * 100)) : 0;
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
                <span className="text-sm font-mono font-bold opacity-90 mt-0.5 bg-black/20 px-2 py-0.5 rounded-lg">
                  {elapsedSince(last)}
                </span>
              )}
              {isAid ? (
                <span className="text-xs opacity-60 mt-1">計{total}{supply.unit}</span>
              ) : (
                <>
                  <div className="w-full mt-1 bg-black/20 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-white/70 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs opacity-60">{total}/{carried.carriedAmount}{supply.unit}</span>
                </>
              )}
            </button>
          );
        })}

        {/* エイド補給ボタン */}
        <button
          onClick={() => setAidDialog(true)}
          className="col-span-2 rounded-2xl p-4 flex items-center justify-center gap-2 border-2 border-dashed border-gray-600 text-gray-400 active:border-gray-400 active:text-gray-300 transition-colors"
          style={{ minHeight: '64px' }}
        >
          <Plus size={20} />
          <span className="font-semibold">エイドで受け取った補給を記録</span>
        </button>
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

      {/* Undo toast */}
      {undoRecord && (
        <div className="fixed bottom-4 left-3 right-3 z-40 flex items-center gap-3 bg-gray-700 rounded-2xl px-4 py-3 shadow-lg">
          <span className="text-xl">{undoRecord.supply.emoji}</span>
          <span className="flex-1 text-sm text-white">
            {undoRecord.supply.name} {undoRecord.record.amount}{undoRecord.supply.unit} を記録
          </span>
          <button
            onClick={handleUndo}
            className="text-yellow-400 font-bold text-sm px-3 py-1.5 rounded-xl border border-yellow-400/50 active:bg-yellow-400/20"
          >
            取り消す
          </button>
        </div>
      )}

      {/* Memo dialog */}
      {memoDialog && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="bg-white text-gray-900 w-full rounded-t-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">メモ</h2>
              <button onClick={() => { setMemoDialog(false); setMemoText(''); }} className="p-1 text-gray-400">
                <X size={22} />
              </button>
            </div>
            <textarea
              value={memoText}
              onChange={e => setMemoText(e.target.value)}
              placeholder="現在の状況、体調、エイドの場所など…"
              className="w-full border-2 rounded-xl px-3 py-3 text-base resize-none"
              rows={4}
              autoFocus
            />
            <div className="flex gap-3 mt-3">
              <button onClick={() => { setMemoDialog(false); setMemoText(''); }}
                className="flex-1 py-3 border rounded-xl font-medium text-gray-700">キャンセル</button>
              <button onClick={saveMemo} disabled={!memoText.trim()}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-40">保存</button>
            </div>
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

      {/* Aid station picker dialog */}
      {aidDialog && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="bg-white text-gray-900 w-full rounded-t-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b">
              <h2 className="text-lg font-bold">エイド補給を記録</h2>
              <button onClick={() => setAidDialog(false)} className="p-1 text-gray-400">
                <X size={22} />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4">
              {/* マスターから選ぶ */}
              {supplies.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-2">マスターから選ぶ</p>
                  <div className="grid grid-cols-3 gap-3">
                    {supplies.map(supply => (
                      <button
                        key={supply.id}
                        onClick={() => openAmountDialog(supply)}
                        className="rounded-2xl p-3 flex flex-col items-center gap-1 active:scale-95 transition-transform"
                        style={{ backgroundColor: supply.color }}
                      >
                        <span className="text-3xl leading-none">{supply.emoji}</span>
                        <span className="text-white font-semibold text-xs text-center leading-tight">{supply.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 名前で自由入力 */}
              <div className="border-t pt-4">
                <p className="text-xs text-gray-400 font-medium mb-3">名前を入力して記録（マスターにない補給）</p>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={adhocName}
                    onChange={e => setAdhocName(e.target.value)}
                    placeholder="補給名（例: コーラ、おにぎり）"
                    className="w-full border-2 rounded-xl px-3 py-3 text-base"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      onFocus={e => e.target.select()}
                      value={adhocAmount}
                      onChange={e => setAdhocAmount(e.target.value)}
                      placeholder="量"
                      className="flex-1 border-2 rounded-xl px-3 py-3 text-base"
                      min={0}
                    />
                    <input
                      type="text"
                      value={adhocUnit}
                      onChange={e => setAdhocUnit(e.target.value)}
                      placeholder="単位"
                      className="w-20 border-2 rounded-xl px-3 py-3 text-base text-center"
                    />
                    <button
                      onClick={recordAdhoc}
                      disabled={!adhocName.trim() || !(parseFloat(adhocAmount) > 0)}
                      className="px-4 py-3 bg-orange-500 text-white rounded-xl font-semibold disabled:opacity-40"
                    >
                      記録
                    </button>
                  </div>
                </div>
              </div>
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
                  className="py-3 border-2 rounded-xl font-medium text-sm border-gray-200">
                  {opt.label}
                </button>
              ))}
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                      onFocus={e => e.target.select()}
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

      <span className="hidden">{tick}</span>
    </div>
  );
}
