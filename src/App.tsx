import { useState, useCallback } from 'react';
import { AppData, Activity, SupplyItem } from './types';
import { loadData, updateSupplies, upsertActivity, deleteActivity } from './utils/storage';
import HomeView from './components/HomeView';
import SupplyMaster from './components/SupplyMaster';
import ActivitySetup from './components/ActivitySetup';
import RaceMode from './components/RaceMode';
import HistoryView from './components/HistoryView';

type View =
  | { type: 'home' }
  | { type: 'supply-master' }
  | { type: 'activity-setup'; activityId?: string }
  | { type: 'race'; activityId: string }
  | { type: 'history'; activityId: string };

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [view, setView] = useState<View>({ type: 'home' });

  const refresh = useCallback(() => setData(loadData()), []);

  function handleSuppliesUpdate(supplies: SupplyItem[]) {
    const updated = updateSupplies(supplies);
    setData(updated);
  }

  function handleActivitySave(activity: Activity) {
    const updated = upsertActivity(activity);
    setData(updated);
    if (activity.status === 'active') {
      setView({ type: 'race', activityId: activity.id });
    } else {
      setView({ type: 'home' });
    }
  }

  function handleActivityUpdate(activity: Activity) {
    const updated = upsertActivity(activity);
    setData(updated);
  }

  function handleRaceFinish(activity: Activity) {
    const updated = upsertActivity(activity);
    setData(updated);
    setView({ type: 'history', activityId: activity.id });
  }

  function handleOpenActivity(activity: Activity) {
    if (activity.status === 'active') {
      setView({ type: 'race', activityId: activity.id });
    } else if (activity.status === 'preparing') {
      setView({ type: 'activity-setup', activityId: activity.id });
    } else {
      setView({ type: 'history', activityId: activity.id });
    }
  }

  function handleDeleteActivity(id: string) {
    const updated = deleteActivity(id);
    setData(updated);
  }

  function handleHistoryResume(activity: Activity) {
    const updated = upsertActivity(activity);
    setData(updated);
    setView({ type: 'race', activityId: activity.id });
  }

  if (view.type === 'supply-master') {
    return (
      <SupplyMaster
        supplies={data.supplies}
        onUpdate={handleSuppliesUpdate}
        onBack={() => setView({ type: 'home' })}
      />
    );
  }

  if (view.type === 'activity-setup') {
    const existing = view.activityId ? data.activities.find(a => a.id === view.activityId) : undefined;
    return (
      <ActivitySetup
        supplies={data.supplies}
        activity={existing}
        onSave={handleActivitySave}
        onBack={() => setView({ type: 'home' })}
      />
    );
  }

  if (view.type === 'race') {
    const activity = data.activities.find(a => a.id === view.activityId);
    if (!activity) { setView({ type: 'home' }); return null; }
    return (
      <RaceMode
        activity={activity}
        supplies={data.supplies}
        onUpdate={handleActivityUpdate}
        onFinish={handleRaceFinish}
      />
    );
  }

  if (view.type === 'history') {
    const activity = data.activities.find(a => a.id === view.activityId);
    if (!activity) { setView({ type: 'home' }); return null; }
    return (
      <HistoryView
        activity={activity}
        supplies={data.supplies}
        onBack={() => setView({ type: 'home' })}
        onUpdate={act => { handleActivityUpdate(act); refresh(); }}
        onResume={handleHistoryResume}
      />
    );
  }

  return (
    <HomeView
      activities={data.activities}
      onNewActivity={() => setView({ type: 'activity-setup' })}
      onOpenSupplyMaster={() => setView({ type: 'supply-master' })}
      onOpenActivity={handleOpenActivity}
      onDeleteActivity={handleDeleteActivity}
    />
  );
}
