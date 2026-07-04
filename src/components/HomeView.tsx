import { Plus, Settings, Play, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import { Activity } from '../types';

interface Props {
  activities: Activity[];
  onNewActivity: () => void;
  onOpenSupplyMaster: () => void;
  onOpenActivity: (activity: Activity) => void;
}

const STATUS_LABEL: Record<Activity['status'], string> = {
  preparing: '準備中',
  active: '進行中',
  completed: '完了',
};

const STATUS_COLOR: Record<Activity['status'], string> = {
  preparing: 'text-yellow-600 bg-yellow-50',
  active: 'text-green-700 bg-green-50',
  completed: 'text-gray-500 bg-gray-100',
};

export default function HomeView({ activities, onNewActivity, onOpenSupplyMaster, onOpenActivity }: Props) {
  const active = activities.filter(a => a.status === 'active');
  const others = activities.filter(a => a.status !== 'active');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">補給管理</h1>
            <p className="text-xs text-gray-400 mt-0.5">トレイルラン補給トラッカー</p>
          </div>
          <button onClick={onOpenSupplyMaster}
            className="flex items-center gap-1.5 text-gray-600 border px-3 py-2 rounded-xl text-sm font-medium">
            <Settings size={16} />補給マスター
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* New activity */}
        <button onClick={onNewActivity}
          className="w-full bg-blue-600 text-white rounded-2xl p-4 flex items-center gap-3 shadow-md active:scale-98 transition-transform">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Plus size={28} />
          </div>
          <div className="text-left">
            <div className="font-bold text-lg">新規アクティビティ</div>
            <div className="text-sm text-blue-100">レースや練習を記録する</div>
          </div>
          <ChevronRight size={20} className="ml-auto opacity-70" />
        </button>

        {/* Active */}
        {active.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">進行中</h2>
            <div className="space-y-3">
              {active.map(a => (
                <ActivityCard key={a.id} activity={a} onClick={() => onOpenActivity(a)} />
              ))}
            </div>
          </div>
        )}

        {/* Others */}
        {others.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">過去の記録</h2>
            <div className="space-y-3">
              {others.map(a => (
                <ActivityCard key={a.id} activity={a} onClick={() => onOpenActivity(a)} />
              ))}
            </div>
          </div>
        )}

        {activities.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🏃</div>
            <div className="font-medium">アクティビティがありません</div>
            <div className="text-sm mt-1">上のボタンから新規作成してください</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityCard({ activity, onClick }: { activity: Activity; onClick: () => void }) {
  const totalRecords = activity.records.length;
  return (
    <button onClick={onClick} className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 text-left active:bg-gray-50">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${activity.status === 'active' ? 'bg-green-100' : activity.status === 'preparing' ? 'bg-yellow-100' : 'bg-gray-100'}`}>
        {activity.status === 'active' ? <Play size={18} className="text-green-700 ml-0.5" /> :
         activity.status === 'completed' ? <CheckCircle size={18} className="text-gray-400" /> :
         <Clock size={18} className="text-yellow-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 truncate">{activity.name}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {activity.date}
          {activity.startTime && ` ・ ${activity.startTime}スタート`}
          {` ・ ${totalRecords}件の記録`}
        </div>
      </div>
      <div className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${STATUS_COLOR[activity.status]}`}>
        {STATUS_LABEL[activity.status]}
      </div>
    </button>
  );
}
