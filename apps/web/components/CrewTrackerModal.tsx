'use client';

import React, { useState } from 'react';
import { Crew } from '@civiclens/shared-types';
import { Navigation, Play, Radio, Check } from 'lucide-react';

interface CrewTrackerModalProps {
  crews: Crew[];
  onUpdateCrewLocation: (crewId: string, lat: number, lon: number, status: string) => Promise<void>;
}

export const CrewTrackerModal: React.FC<CrewTrackerModalProps> = ({
  crews,
  onUpdateCrewLocation,
}) => {
  const [selectedCrewId, setSelectedCrewId] = useState<string>(crews[0]?.id || 'CREW-01');
  const [isSimulating, setIsSimulating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedCrew = crews.find((c) => c.id === selectedCrewId) || crews[0];

  const handleSimulateMove = async () => {
    if (!selectedCrew) return;
    setIsSimulating(true);

    // Add small delta
    const deltaLat = (Math.random() - 0.5) * 0.005;
    const deltaLon = (Math.random() - 0.5) * 0.005;
    const newLat = +(selectedCrew.latitude + deltaLat).toFixed(4);
    const newLon = +(selectedCrew.longitude + deltaLon).toFixed(4);

    try {
      await onUpdateCrewLocation(selectedCrew.id, newLat, newLon, 'dispatched');
      setNotice(`Broadcasted GPS move for ${selectedCrew.name}: (${newLat}, ${newLon}) via WebSockets!`);
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <h4 className="text-white font-bold text-sm">Crew Role Live GPS Broadcaster</h4>
        </div>
        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
          PATCH /crews/:id/location
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Active Crew Vehicle
          </label>
          <select
            value={selectedCrewId}
            onChange={(e) => setSelectedCrewId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs p-2.5 rounded-xl focus:outline-none focus:border-sky-500"
          >
            {crews.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.id}) - {c.status.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {selectedCrew && (
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Current GPS:</span>
              <span className="text-white font-mono">{selectedCrew.latitude.toFixed(4)}, {selectedCrew.longitude.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Ward Assignment:</span>
              <span className="text-white font-medium">{selectedCrew.ward_id}</span>
            </div>
          </div>
        )}

        {notice && (
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        <button
          onClick={handleSimulateMove}
          disabled={isSimulating}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Simulate En-Route GPS Movement
        </button>
      </div>
    </div>
  );
};
