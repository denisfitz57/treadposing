import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DataPoint {
  time: string;
  speed: number;
  incline: number;
}

interface LiveChartsProps {
  data: DataPoint[];
}

const LiveCharts: React.FC<LiveChartsProps> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 gap-4 h-full">
      {/* Speed Chart */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 flex flex-col">
        <h3 className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wider">Speed (km/h)</h3>
        <div className="flex-1 min-h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" hide />
              <YAxis domain={['auto', 'auto']} stroke="#9CA3AF" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', color: '#F3F4F6' }}
              />
              <Line 
                type="monotone" 
                dataKey="speed" 
                stroke="#3B82F6" 
                strokeWidth={2} 
                dot={false} 
                isAnimationActive={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Incline Chart */}
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 flex flex-col">
        <h3 className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wider">Incline (%)</h3>
        <div className="flex-1 min-h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" hide />
              <YAxis domain={['auto', 'auto']} stroke="#9CA3AF" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', color: '#F3F4F6' }}
              />
              <Line 
                type="monotone" 
                dataKey="incline" 
                stroke="#10B981" 
                strokeWidth={2} 
                dot={false}
                isAnimationActive={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default LiveCharts;