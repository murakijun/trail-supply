import { useState } from 'react';
import { ChevronLeft, Check, Plus, Minus } from 'lucide-react';
import { Activity, SupplyItem, CarriedSupply } from '../types';
import { generateId } from '../utils/storage';

interface Props {
  supplies: SupplyItem[];
  activity?: Activity;
  onSave: (activity: Activity) => void;
  onBack: () => void;
}

export default function ActivitySetup({ supplies, activity, onSave, onBack }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState(activity?.name ?? '');
  const [date, setDate] = useState(activity?.date ?? today);
  const [startTime, setStartTime] = useState(activity?.startTime ?? '');
  const [carried, setCarried] = useState<CarriedSupply[]>(activity?.carriedSupplies ?? []);

  function toggleSupply(supplyId: string) {
    if (carried.some(c => c.supplyId === supplyId)) {
      setCarried(carried.filter(c => c.supplyId !== supplyId));
    } else {
      setCarried([...carried, { supplyId, carriedAmount: 1 }]);
    }
  }

  function updateAmount(supplyId: string, delta: number) {
    setCarried(carried.map(c => c.supplyId === supplyId
      ? { ...c, carriedAmount: Math.max(0, c.carriedAmount + delta) }
      : c
    ));
  }

  function setAmount(supplyId: string, value: number) {
    setCarried(carried.map(c => c.supplyId === supplyId ? { ...c, carriedAmount: value } : c));
  }

  function handleStart() {
    if (!name.trim()) return alert('アクティビティ名を入力してください');
    const act: Activity = {
      id: activity?.id ?? generateId(),
      name: name.trim(),
      date,
      startTime: startTime || undefined,
      status: 'active',
      carriedSupplies: carried.filter(c => c.carriedAmount > 0),
      records: activity?.records ?? [],
    };
    onSave(act);
  }

  function handleSaveDraft() {
    if (!name.trim()) return alert('アクティビティ名を入力してください');
    const act: Activity = {
      id: activity?.id ?? generateId(),
      name: name.trim(),
      date,
      startTime: startTime || undefined,
      status: 'preparing',
      carriedSupplies: carried.filter(c => c.carriedAmount > 0),
      records: activity?.records ?? [],
    };
    onSave(act);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-600"><ChevronLeft size={24} /></button>
        <h1 className="text-lg font-bold flex-1">アクティビティ準備</h1>
      </header>

      <div className="p-4 space-y-5">
        {/* Basic info */}
        <div className="bg-white rounded-xl p-4 space-y-4">
          <h2 className="font-semibold text-gray-800">基本情報</h2>
          <div>
            <label className="text-sm text-gray-600 block mb-1">アクティビティ名 *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-base"
              placeholder="例: 奥武蔵50K"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm text-gray-600 block mb-1">日付</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-base"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-600 block mb-1">スタート時刻</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-base"
              />
            </div>
          </div>
        </div>

        {/* Carried supplies */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold text-gray-800 mb-3">持参補給</h2>
          {supplies.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">補給マスターにアイテムがありません</p>
          )}
          <div className="space-y-3">
            {supplies.map(supply => {
              const c = carried.find(x => x.supplyId === supply.id);
              const selected = !!c;
              return (
                <div key={supply.id} className={`rounded-xl border-2 transition-colors ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-3 p-3">
                    <button onClick={() => toggleSupply(supply.id)} className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: supply.color + '33' }}>
                        {supply.emoji}
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">{supply.name}</div>
                        <div className="text-xs text-gray-500">{supply.defaultAmount}{supply.unit}/タップ</div>
                      </div>
                    </button>
                    {selected && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateAmount(supply.id, -supply.defaultAmount)}
                          className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <Minus size={14} />
                        </button>
                        <input
                          type="text" inputMode="decimal"
                      onFocus={e => e.target.select()}
                          value={c.carriedAmount}
                          onChange={e => setAmount(supply.id, Number(e.target.value))}
                          className="w-16 text-center border rounded-lg py-1 text-sm"
                          min={0}
                        />
                        <span className="text-xs text-gray-500">{supply.unit}</span>
                        <button onClick={() => updateAmount(supply.id, supply.defaultAmount)}
                          className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <Plus size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="sticky bottom-0 bg-white border-t px-4 py-4 flex gap-3">
        <button onClick={handleSaveDraft} className="flex-none px-4 py-3 border rounded-xl font-medium text-gray-700 text-sm">
          下書き保存
        </button>
        <button onClick={handleStart} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold text-base flex items-center justify-center gap-2">
          <Check size={20} />レース開始
        </button>
      </div>
    </div>
  );
}
