import { useState } from 'react';
import { ChevronLeft, Trash2, Play, NotebookPen, Pencil, X } from 'lucide-react';
import { Activity, SupplyItem } from '../types';

interface Props {
  activity: Activity;
  supplies: SupplyItem[];
  onBack: () => void;
  onUpdate: (activity: Activity) => void;
  onResume: (activity: Activity) => void;
}

type EditState =
  | { kind: 'record'; id: string; supply: SupplyItem; amount: number; time: string }
  | { kind: 'memo';   id: string; text: string; time: string };

function toHM(timestamp: string) {
  const t = new Date(timestamp);
  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
}

export default function HistoryView({ activity, supplies, onBack, onUpdate, onResume }: Props) {
  const [editState, setEditState] = useState<EditState | null>(null);

  // 補給記録とメモを時系列にマージ
  type TimelineItem =
    | { kind: 'record'; id: string; supplyId: string; amount: number; timestamp: string }
    | { kind: 'memo';   id: string; text: string; timestamp: string };

  const timeline: TimelineItem[] = [
    ...activity.records.map(r => ({ kind: 'record' as const, ...r })),
    ...(activity.memos ?? []).map(m => ({ kind: 'memo' as const, ...m })),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  function deleteRecord(id: string) {
    onUpdate({ ...activity, records: activity.records.filter(r => r.id !== id) });
  }

  function handleResume() {
    onResume({ ...activity, status: 'active' });
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

  // 編集開始
  function startEditRecord(item: { id: string; supplyId: string; amount: number; timestamp: string }) {
    const supply = supplies.find(s => s.id === item.supplyId);
    if (!supply) return;
    setEditState({ kind: 'record', id: item.id, supply, amount: item.amount, time: toHM(item.timestamp) });
  }

  function startEditMemo(item: { id: string; text: string; timestamp: string }) {
    setEditState({ kind: 'memo', id: item.id, text: item.text, time: toHM(item.timestamp) });
  }

  // 編集保存
  function saveEdit() {
    if (!editState) return;
    // HH:MM → ISO timestamp（アクティビティの日付ベース）
    const newTs = new Date(`${activity.date}T${editState.time}:00`).toISOString();

    if (editState.kind === 'record') {
      onUpdate({
        ...activity,
        records: activity.records.map(r =>
          r.id === editState.id ? { ...r, amount: editState.amount, timestamp: newTs } : r
        ),
      });
    } else {
      onUpdate({
        ...activity,
        memos: (activity.memos ?? []).map(m =>
          m.id === editState.id ? { ...m, text: editState.text, timestamp: newTs } : m
        ),
      });
    }
    setEditState(null);
  }

  // Per-supply stats（持参分）
  const supplyStats = activity.carriedSupplies.map(c => {
    const supply = supplies.find(s => s.id === c.supplyId);
    if (!supply) return null;
    const total = activity.records.filter(r => r.supplyId === c.supplyId).reduce((s, r) => s + r.amount, 0);
    const pct = c.carriedAmount > 0 ? Math.min(100, Math.round((total / c.carriedAmount) * 100)) : 0;
    return { supply, carried: c.carriedAmount, total, pct };
  }).filter(Boolean) as { supply: SupplyItem; carried: number; total: number; pct: number }[];

  // エイドで受け取った補給
  const carriedIds = new Set(activity.carriedSupplies.map(c => c.supplyId));
  const aidStats = [...new Set(activity.records.filter(r => !carriedIds.has(r.supplyId)).map(r => r.supplyId))]
    .map(id => {
      const supply = supplies.find(s => s.id === id);
      if (!supply) return null;
      const total = activity.records.filter(r => r.supplyId === id).reduce((s, r) => s + r.amount, 0);
      return { supply, total };
    }).filter(Boolean) as { supply: SupplyItem; total: number }[];

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
        {(supplyStats.length > 0 || aidStats.length > 0) && (
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
              {aidStats.length > 0 && (
                <>
                  {supplyStats.length > 0 && <div className="border-t pt-3 mt-1" />}
                  <div className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-2">エイド受け取り</div>
                  {aidStats.map(({ supply, total }) => (
                    <div key={supply.id} className="flex items-center gap-2">
                      <span className="text-lg">{supply.emoji}</span>
                      <span className="font-medium text-sm text-gray-800 flex-1">{supply.name}</span>
                      <span className="text-sm text-gray-500">{total}{supply.unit}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium">エイド</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold text-gray-800 mb-3">タイムライン</h2>
          {timeline.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-6">記録がありません</p>
          )}
          <div className="space-y-2">
            {timeline.map(item => {
              const hm = toHM(item.timestamp);
              const elapsed = elapsedFrom(item.timestamp);

              if (item.kind === 'memo') {
                return (
                  <div key={item.id} className="flex items-start gap-3 py-1.5 border-b last:border-0">
                    <div className="text-center flex-shrink-0 w-14">
                      <div className="text-sm font-mono text-gray-700">{hm}</div>
                      {elapsed && <div className="text-xs text-gray-400">{elapsed}</div>}
                    </div>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50">
                      <NotebookPen size={15} className="text-blue-400" />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.text}</p>
                    </div>
                    <button onClick={() => startEditMemo(item)} className="p-2 text-gray-300 active:text-blue-500 flex-shrink-0">
                      <Pencil size={15} />
                    </button>
                  </div>
                );
              }

              const supply = supplies.find(s => s.id === item.supplyId);
              if (!supply) return null;
              return (
                <div key={item.id} className="flex items-center gap-3 py-1.5 border-b last:border-0">
                  <div className="text-center flex-shrink-0 w-14">
                    <div className="text-sm font-mono text-gray-700">{hm}</div>
                    {elapsed && <div className="text-xs text-gray-400">{elapsed}</div>}
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: supply.color + '33' }}>
                    {supply.emoji}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{supply.name}</span>
                    <span className="text-gray-500 text-sm ml-2">{item.amount}{supply.unit}</span>
                  </div>
                  <button onClick={() => startEditRecord(item)} className="p-2 text-gray-300 active:text-blue-500">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => deleteRecord(item.id)} className="p-2 text-gray-300 active:text-red-500">
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit dialog */}
      {editState && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editState.kind === 'record'
                  ? `${editState.supply.emoji} ${editState.supply.name} を編集`
                  : 'メモを編集'}
              </h2>
              <button onClick={() => setEditState(null)} className="p-1 text-gray-400"><X size={22} /></button>
            </div>

            {editState.kind === 'record' ? (
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">量</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editState.amount}
                      onChange={e => setEditState({ ...editState, amount: Number(e.target.value) })}
                      className="flex-1 border-2 rounded-xl px-3 py-2 text-lg text-center"
                      min={0} step={0.5}
                    />
                    <span className="text-gray-500">{editState.supply.unit}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">時刻</label>
                  <input
                    type="time"
                    value={editState.time}
                    onChange={e => setEditState({ ...editState, time: e.target.value })}
                    className="w-full border-2 rounded-xl px-3 py-2 text-lg"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">時刻</label>
                  <input
                    type="time"
                    value={editState.time}
                    onChange={e => setEditState({ ...editState, time: e.target.value })}
                    className="w-full border-2 rounded-xl px-3 py-2 text-base"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">テキスト</label>
                  <textarea
                    value={editState.text}
                    onChange={e => setEditState({ ...editState, text: e.target.value })}
                    className="w-full border-2 rounded-xl px-3 py-2 text-base resize-none"
                    rows={3}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setEditState(null)} className="flex-1 py-3 border rounded-xl font-medium text-gray-700">キャンセル</button>
              <button onClick={saveEdit} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
