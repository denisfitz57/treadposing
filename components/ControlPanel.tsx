import React from 'react';
import { ScenarioConfig } from '../types';
import { Play, Square, Settings, Activity } from 'lucide-react';

interface ControlPanelProps {
  config: ScenarioConfig;
  onConfigChange: (newConfig: ScenarioConfig) => void;
  isScenarioActive: boolean;
  toggleScenario: () => void;
  isRecording: boolean;
  toggleRecording: () => void;
  currentSpeed: number;
  currentIncline: number;
  sessionCount: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  onConfigChange,
  isScenarioActive,
  toggleScenario,
  isRecording,
  toggleRecording,
  currentSpeed,
  currentIncline,
  sessionCount
}) => {
  const handleChange = (section: 'speed' | 'incline', field: keyof ScenarioConfig['speed'] | keyof ScenarioConfig['incline'], value: string) => {
    const numVal = parseFloat(value);
    if (isNaN(numVal)) return;
    
    // Type assertion needed because TS doesn't know which specific key belongs to which section union
    const newSectionConfig = {
        ...config[section],
        [field]: numVal
    };

    onConfigChange({
      ...config,
      [section]: newSectionConfig
    });
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-6">
      
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 p-4 rounded-md border border-gray-700">
          <p className="text-gray-400 text-xs uppercase font-bold">Current Speed</p>
          <p className="text-3xl font-mono text-blue-400">{currentSpeed.toFixed(1)} <span className="text-sm text-gray-500">km/h</span></p>
        </div>
        <div className="bg-gray-800 p-4 rounded-md border border-gray-700">
          <p className="text-gray-400 text-xs uppercase font-bold">Current Incline</p>
          <p className="text-3xl font-mono text-emerald-400">{currentIncline.toFixed(1)} <span className="text-sm text-gray-500">%</span></p>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex space-x-4">
        <button
          onClick={toggleScenario}
          className={`flex-1 flex items-center justify-center p-4 rounded font-bold transition-all ${
            isScenarioActive 
              ? 'bg-red-500/20 text-red-400 border border-red-500 hover:bg-red-500/30' 
              : 'bg-green-600 hover:bg-green-500 text-white'
          }`}
        >
          {isScenarioActive ? (
            <><Square size={20} className="mr-2" /> Stop Scenario</>
          ) : (
            <><Play size={20} className="mr-2" /> Start Random Walk</>
          )}
        </button>

        <button
          onClick={toggleRecording}
          className={`flex-1 flex items-center justify-center p-4 rounded font-bold transition-all ${
            isRecording
              ? 'bg-amber-500 text-white animate-pulse'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          }`}
        >
          {isRecording ? (
            <><Square size={20} className="mr-2" /> Stop Recording ({sessionCount})</>
          ) : (
            <><Activity size={20} className="mr-2" /> Record Data</>
          )}
        </button>
      </div>

      {/* Scenario Configuration */}
      <div className="space-y-4 pt-4 border-t border-gray-800">
        <div className="flex items-center text-gray-400 mb-2">
          <Settings size={18} className="mr-2" />
          <h3 className="font-semibold uppercase text-xs tracking-wider">Scenario Parameters (Random Walk)</h3>
        </div>

        {/* Speed Config */}
        <div className="p-3 bg-gray-950/50 rounded border border-gray-800">
            <h4 className="text-xs font-bold text-blue-400 uppercase mb-2">Speed Settings</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
                <label className="block text-[10px] text-gray-500 mb-1">Min (km/h)</label>
                <input 
                type="number" step="0.1"
                value={config.speed.min}
                onChange={(e) => handleChange('speed', 'min', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                />
            </div>
            <div>
                <label className="block text-[10px] text-gray-500 mb-1">Max (km/h)</label>
                <input 
                type="number" step="0.1"
                value={config.speed.max}
                onChange={(e) => handleChange('speed', 'max', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                />
            </div>
            <div>
                <label className="block text-[10px] text-gray-500 mb-1">Volatility</label>
                <input 
                type="number" step="0.1"
                value={config.speed.volatility}
                onChange={(e) => handleChange('speed', 'volatility', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                />
            </div>
            <div>
                <label className="block text-[10px] text-gray-500 mb-1">Interval (s)</label>
                <input 
                type="number" step="1" min="1"
                value={config.speed.updateInterval / 1000}
                onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) handleChange('speed', 'updateInterval', (val * 1000).toString());
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                />
            </div>
            </div>
        </div>

        {/* Incline Config */}
        <div className="p-3 bg-gray-950/50 rounded border border-gray-800">
            <h4 className="text-xs font-bold text-emerald-400 uppercase mb-2">Incline Settings</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
                <label className="block text-[10px] text-gray-500 mb-1">Min (%)</label>
                <input 
                type="number" step="0.5"
                value={config.incline.min}
                onChange={(e) => handleChange('incline', 'min', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-emerald-500"
                />
            </div>
            <div>
                <label className="block text-[10px] text-gray-500 mb-1">Max (%)</label>
                <input 
                type="number" step="0.5"
                value={config.incline.max}
                onChange={(e) => handleChange('incline', 'max', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-emerald-500"
                />
            </div>
            <div>
                <label className="block text-[10px] text-gray-500 mb-1">Volatility</label>
                <input 
                type="number" step="0.1"
                value={config.incline.volatility}
                onChange={(e) => handleChange('incline', 'volatility', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-emerald-500"
                />
            </div>
            <div>
                <label className="block text-[10px] text-gray-500 mb-1">Interval (s)</label>
                <input 
                type="number" step="1" min="1"
                value={config.incline.updateInterval / 1000}
                onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) handleChange('incline', 'updateInterval', (val * 1000).toString());
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-emerald-500"
                />
            </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default ControlPanel;