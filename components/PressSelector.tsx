import React, { useMemo } from 'react';
import { usePresses } from '../hooks/usePresses';
import { useAreas } from '../hooks/useAreas';
import LoadingSpinner from './LoadingSpinner';

interface PressSelectorProps {
  selectedItem: string | null;
  onSelectItem: (id: string) => void;
  label?: string;
}

const PressSelector: React.FC<PressSelectorProps> = ({ selectedItem, onSelectItem, label }) => {
  const { presses, loadingPresses } = usePresses();
  const { areas, loadingAreas } = useAreas();

  const areasMap = useMemo(() => new Map(areas.map(a => [a.id, a.name])), [areas]);

  if (loadingPresses || loadingAreas) {
    return <LoadingSpinner message={"Loading Presses..."} />;
  }

  if (presses.length === 0) {
    return <p className="text-center text-slate-500 dark:text-slate-400 my-4">No presses available.</p>;
  }

  return (
    <div className="mb-6 w-full">
      {label && <label htmlFor={"press-selector"} className="block text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">
        {label}
      </label>}
      <div className="relative">
        <select
            id={"press-selector"}
            value={selectedItem || ''}
            onChange={(e) => onSelectItem(e.target.value)}
            className="w-full p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-lg font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
        >
            <option value="" disabled>
            Choose a press
            </option>
            {presses.map((press) => (
            <option key={press.id} value={press.id}>
                {press.name} ({areasMap.get(press.areaId) || 'No Area'})
            </option>
            ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
            <svg className="w-5 h-5 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>
    </div>
  );
};

export default PressSelector;