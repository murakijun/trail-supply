import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, ChevronLeft } from 'lucide-react';
import { SupplyItem, SupplyCategory } from '../types';
import { generateId } from '../utils/storage';

interface Props {
  supplies: SupplyItem[];
  onUpdate: (supplies: SupplyItem[]) => void;
  onBack: () => void;
}

const CATEGORIES: { value: SupplyCategory; label: string }[] = [
  { value: 'gel', label: 'ジェル' },
  { value: 'drink', label: 'ドリンク' },
  { value: 'food', label: '食べ物' },
  { value: 'salt', label: '塩分' },
  { value: 'supplement', label: 'サプリ' },
  { value: 'other', label: 'その他' },
];

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
];

const EMOJIS = ['🟠', '💧', '🟡', '🧂', '🍬', '🍌', '💊', '⚡', '🥤', '🍎', '🫘', '🏃'];

const EMPTY_FORM: Omit<SupplyItem, 'id'> = {
  name: '',
  category: 'gel',
  unit: '個',
  defaultAmount: 1,
  color: '#f97316',
  emoji: '🟠',
};

export default function SupplyMaster({ supplies, onUpdate, onBack }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<SupplyItem, 'id'>>(EMPTY_FORM);

  function startAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function startEdit(item: SupplyItem) {
    setEditingId(item.id);
    setForm({ name: item.name, category: item.category, unit: item.unit, defaultAmount: item.defaultAmount, color: item.color, emoji: item.emoji });
    setShowForm(true);
  }

  function cancel() {
    setShowForm(false);
    setEditingId(null);
  }

  function save() {
    if (!form.name.trim()) return;
    if (editingId) {
      onUpdate(supplies.map(s => s.id === editingId ? { ...s, ...form } : s));
    } else {
      onUpdate([...supplies, { id: generateId(), ...form }]);
    }
    setShowForm(false);
    setEditingId(null);
  }

  function remove(id: string) {
    if (confirm('このアイテムを削除しますか？')) {
      onUpdate(supplies.filter(s => s.id !== id));
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-600">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold flex-1">補給マスター</h1>
        <button onClick={startAdd} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} />新規
        </button>
      </header>

      <div className="p-4 space-y-3">
        {supplies.length === 0 && (
          <p className="text-center text-gray-400 py-12">補給アイテムがありません</p>
        )}
        {supplies.map(item => (
          <div key={item.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: item.color + '22' }}>
              {item.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900">{item.name}</div>
              <div className="text-sm text-gray-500">
                {CATEGORIES.find(c => c.value === item.category)?.label} ・ {item.defaultAmount}{item.unit}/タップ
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(item)} className="p-2 text-gray-400 hover:text-blue-600">
                <Pencil size={18} />
              </button>
              <button onClick={() => remove(item.id)} className="p-2 text-gray-400 hover:text-red-500">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editingId ? '編集' : '新規アイテム'}</h2>
              <button onClick={cancel}><X size={20} /></button>
            </div>

            {/* Emoji picker */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">アイコン</label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))}
                    className={`w-10 h-10 text-xl rounded-lg border-2 ${form.emoji === e ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">名前</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-base"
                placeholder="例: ジェル"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">カテゴリ</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button key={c.value} onClick={() => setForm(f => ({ ...f, category: c.value }))}
                    className={`px-3 py-1.5 rounded-full text-sm border ${form.category === c.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700'}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Unit + defaultAmount */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 block mb-1">単位</label>
                <input
                  type="text"
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-base"
                  placeholder="個, ml, g..."
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 block mb-1">1タップの量</label>
                <input
                  type="number"
                      onFocus={e => e.target.select()}
                  value={form.defaultAmount}
                  onChange={e => setForm(f => ({ ...f, defaultAmount: Number(e.target.value) }))}
                  className="w-full border rounded-lg px-3 py-2 text-base"
                  min={0.1}
                  step={0.5}
                />
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">ボタン色</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={`w-9 h-9 rounded-full border-4 ${form.color === c ? 'border-gray-800' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={cancel} className="flex-1 py-3 border rounded-xl font-medium text-gray-700">キャンセル</button>
              <button onClick={save} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                <Check size={18} />保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
