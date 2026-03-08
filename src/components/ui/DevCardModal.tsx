import { useState } from 'react';
import { ResourceType, DevelopmentCardType } from '@/types/catan';
import { RESOURCE_COLORS } from '@/lib/constants';
import { Layers, X } from 'lucide-react';
import { clsx } from 'clsx';

interface DevCardModalProps {
  cardType: DevelopmentCardType;
  onClose: () => void;
  onSubmit: (cardArgs: any) => void;
}

const formatCardName = (type: DevelopmentCardType) => {
  const names: Record<string, string> = {
    knight: 'Knight', victoryPoint: '+1 VP', roadBuilding: 'Road Bldg', yearOfPlenty: 'Yr of Plenty', monopoly: 'Monopoly'
  };
  return names[type] || type;
};

export function DevCardModal({ cardType, onClose, onSubmit }: DevCardModalProps) {
  const [res1, setRes1] = useState<ResourceType | ''>('');
  const [res2, setRes2] = useState<ResourceType | ''>('');

  const handleMonopolySubmit = () => {
    if (!res1) return;
    onSubmit({ monopolyResource: res1 });
  };

  const handleYearOfPlentySubmit = () => {
    if (!res1 || !res2) return;
    onSubmit({ resource1: res1, resource2: res2 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-800 border border-purple-500/30 p-6 rounded-xl shadow-2xl w-96 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <Layers className="text-purple-400"/> 
          Play {formatCardName(cardType)}
        </h2>

        {/* Monopoly UI */}
        {cardType === 'monopoly' && (
          <>
            <p className="text-sm text-slate-300 mb-4">Select a resource type to steal from all other players.</p>
            <div className="flex gap-2 mb-6">
              {Object.keys(RESOURCE_COLORS).map((res) => (
                <button 
                  key={res}
                  onClick={() => setRes1(res as ResourceType)}
                  className={clsx(
                    "flex-1 p-2 rounded border-2 transition-all",
                    res1 === res ? "border-purple-500 bg-purple-500/20" : "border-slate-700 bg-slate-900/50 hover:border-slate-500"
                  )}
                >
                  <div className="w-4 h-4 rounded-full mx-auto" style={{ backgroundColor: RESOURCE_COLORS[res as ResourceType] }} />
                </button>
              ))}
            </div>
            <button 
              disabled={!res1}
              onClick={handleMonopolySubmit}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 py-3 rounded-lg font-bold text-white transition-all"
            >
              Confirm Play
            </button>
          </>
        )}

        {/* Year of Plenty UI */}
        {cardType === 'yearOfPlenty' && (
          <>
            <p className="text-sm text-slate-300 mb-4">Select two resources to add to your hand.</p>
            <div className="space-y-4 mb-6">
              <div className="flex gap-2">
                {Object.keys(RESOURCE_COLORS).map((res) => (
                  <button 
                    key={`res1-${res}`}
                    onClick={() => setRes1(res as ResourceType)}
                    className={clsx(
                      "flex-1 p-2 rounded border-2 transition-all",
                      res1 === res ? "border-purple-500 bg-purple-500/20" : "border-slate-700 bg-slate-900/50 hover:border-slate-500"
                    )}
                  >
                    <div className="w-4 h-4 rounded-full mx-auto" style={{ backgroundColor: RESOURCE_COLORS[res as ResourceType] }} />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {Object.keys(RESOURCE_COLORS).map((res) => (
                  <button 
                    key={`res2-${res}`}
                    onClick={() => setRes2(res as ResourceType)}
                    className={clsx(
                      "flex-1 p-2 rounded border-2 transition-all",
                      res2 === res ? "border-purple-500 bg-purple-500/20" : "border-slate-700 bg-slate-900/50 hover:border-slate-500"
                    )}
                  >
                    <div className="w-4 h-4 rounded-full mx-auto" style={{ backgroundColor: RESOURCE_COLORS[res as ResourceType] }} />
                  </button>
                ))}
              </div>
            </div>
            <button 
              disabled={!res1 || !res2}
              onClick={handleYearOfPlentySubmit}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 py-3 rounded-lg font-bold text-white transition-all"
            >
              Confirm Play
            </button>
          </>
        )}
      </div>
    </div>
  );
}