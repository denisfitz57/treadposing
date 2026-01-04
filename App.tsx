import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Results } from '@mediapipe/pose';
import WebcamPose from './components/WebcamPose';
import LiveCharts from './components/LiveCharts';
import ControlPanel from './components/ControlPanel';
import { TreadmillState, ScenarioConfig, PoseFrameData, WebSocketStatus, LogEntry } from './types';
import { getNextValue } from './services/randomWalk';
import { Download, Wifi, WifiOff, ArrowRight } from 'lucide-react';

// WebSocket readyState constants
const WS_STATE_CONNECTING = 0;
const WS_STATE_OPEN = 1;
const WS_STATE_CLOSING = 2;
const WS_STATE_CLOSED = 3;

// --- PROTOCOL CONFIGURATION ---
const createProtocolMessage = (type: string, value?: number): object => {
  if (value !== undefined) {
    return { type, value };
  }
  return { type };
};

// Helper to safely parse numbers from strings or numbers
const parseNumber = (val: any): number | undefined => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

const App: React.FC = () => {
  // --- State ---
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>(WebSocketStatus.DISCONNECTED);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // WebSocket Configuration
  const [wsUrl, setWsUrl] = useState('ws://localhost:8000/ws');
  const [inputUrl, setInputUrl] = useState(wsUrl);

  // Treadmill Telemetry State (Truth from Machine)
  const treadmillRef = useRef<TreadmillState>({
    speedKmh: 0,
    inclinePct: 0,
    timestamp: Date.now(),
    isConnected: false
  });
  
  // Command State (Internal Mathematical Target)
  const commandRef = useRef({ speed: 0, incline: 0 });

  // State for UI rendering (Updates only on WS message)
  const [displayState, setDisplayState] = useState<TreadmillState>(treadmillRef.current);

  // Scenario State
  const [isScenarioActive, setIsScenarioActive] = useState(false);
  const [scenarioConfig, setScenarioConfig] = useState<ScenarioConfig>({
    name: "Random Walk",
    speed: { min: 2.0, max: 8.0, volatility: 0.5, updateInterval: 5000 },
    incline: { min: 0, max: 10, volatility: 1.0, updateInterval: 30000 } 
  });

  // Data Recording
  const [isRecording, setIsRecording] = useState(false);
  const recordedDataRef = useRef<PoseFrameData[]>([]);
  const [recordedCount, setRecordedCount] = useState(0);

  // Visualization History
  const [chartData, setChartData] = useState<Array<{time: string, speed: number, incline: number}>>([]);

  // WebSocket Reference
  const wsRef = useRef<WebSocket | null>(null);
  
  const hasLoggedFirstMsg = useRef(false);

  // --- Helper Functions ---
  
  const addLog = useCallback((message: string, type: 'info' | 'error' | 'success' | 'tx' = 'info') => {
    setLogs(prev => [{ timestamp: Date.now(), message, type }, ...prev].slice(0, 200));
  }, []);

  const sendCommand = useCallback((type: string, value?: number, socket?: WebSocket) => {
    const targetWs = socket || wsRef.current;
    if (targetWs && targetWs.readyState === WS_STATE_OPEN) {
      try {
        const payload = createProtocolMessage(type, value);
        const json = JSON.stringify(payload);
        targetWs.send(json);
        addLog(`-> ${json}`, 'tx');
      } catch (err) {
        addLog(`Send Error: ${err}`, 'error');
      }
    }
  }, [addLog]);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.url === wsUrl && wsRef.current?.readyState === WS_STATE_OPEN) return;

    if (wsRef.current) {
        wsRef.current.close();
    }

    setWsStatus(WebSocketStatus.CONNECTING);
    hasLoggedFirstMsg.current = false;
    
    let ws: WebSocket;
    try {
        ws = new WebSocket(wsUrl);
    } catch (e) {
        addLog(`Invalid URL: ${wsUrl}`, 'error');
        setWsStatus(WebSocketStatus.ERROR);
        return;
    }

    ws.onopen = () => {
      if (ws === wsRef.current) {
        setWsStatus(WebSocketStatus.CONNECTED);
        addLog(`Connected to ${wsUrl}`, 'success');
        sendCommand('REQUEST_CONTROL', undefined, ws);
        sendCommand('GET_STATE', undefined, ws); // Request initial state
      }
    };

    ws.onclose = (event) => {
      if (ws === wsRef.current) {
          setWsStatus(WebSocketStatus.DISCONNECTED);
          addLog(`Connection lost (Code: ${event.code}). Retrying in 3s...`, 'error');
          setTimeout(() => {
             if (wsRef.current === ws) {
                 connectWebSocket();
             }
          }, 3000);
      }
    };

    ws.onerror = () => {
       if (ws === wsRef.current) {
         setWsStatus(WebSocketStatus.ERROR);
       }
    };

    ws.onmessage = (event) => {
      try {
        if (!hasLoggedFirstMsg.current) {
           addLog(`Rx: ${event.data.substring(0, 100)}...`, 'info');
           hasLoggedFirstMsg.current = true;
        }

        const msg = JSON.parse(event.data);
        
        // Extract raw values
        let rawSpeed: any;
        let rawIncline: any;

        // 1. Nested 'data' object
        if (msg.data && typeof msg.data === 'object') {
           rawSpeed = msg.data.speed_kmh ?? msg.data.speed ?? msg.data.kph;
           rawIncline = msg.data.incline_pct ?? msg.data.incline ?? msg.data.grade;
        }

        // 2. Flat JSON / fallback
        if (rawSpeed === undefined) {
           rawSpeed = msg.speed ?? msg.speedKmh ?? msg.kph ?? msg.spd;
        }
        if (rawIncline === undefined) {
           rawIncline = msg.incline ?? msg.inclinePct ?? msg.grade ?? msg.inc;
        }

        // 3. QZ / ZWIFT style
        if (msg.type === 'SPEED' || msg.type === 'SET_SPEED') rawSpeed = msg.value;
        if (msg.type === 'INCLINE' || msg.type === 'SET_INCLINE') rawIncline = msg.value;

        // Parse numbers safely
        const newSpeed = parseNumber(rawSpeed);
        const newIncline = parseNumber(rawIncline);

        // Update State if we found ANY relevant data
        if (newSpeed !== undefined || newIncline !== undefined) {
            const newState = {
              speedKmh: newSpeed !== undefined ? newSpeed : treadmillRef.current.speedKmh,
              inclinePct: newIncline !== undefined ? newIncline : treadmillRef.current.inclinePct,
              timestamp: Date.now(),
              isConnected: true
            };
            treadmillRef.current = newState;
            setDisplayState(newState);
        } else {
            // Optional: Log if we got a message but couldn't understand it (rate limited)
            // console.debug("Unparsed message:", msg);
        }

      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    wsRef.current = ws;
  }, [wsUrl, addLog, sendCommand]);

  // --- Effects ---

  // 1. Connection Management
  useEffect(() => {
    connectWebSocket();
    return () => {
      const socket = wsRef.current;
      wsRef.current = null; 
      if (socket) socket.close();
    };
  }, [connectWebSocket]);

  // 2. Chart Update Loop (1Hz)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setChartData(prev => {
        const newData = [
          ...prev,
          {
            time: now.toLocaleTimeString([], { hour12: false, minute:'2-digit', second:'2-digit' }),
            speed: treadmillRef.current.speedKmh,
            incline: treadmillRef.current.inclinePct
          }
        ];
        return newData.slice(-30); 
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 3. Scenario Logic - Initialization
  useEffect(() => {
    if (isScenarioActive) {
      commandRef.current = {
        speed: treadmillRef.current.speedKmh,
        incline: treadmillRef.current.inclinePct
      };
      addLog("Scenario Started: Initialized trackers", "info");
    }
  }, [isScenarioActive, addLog]);

  // 4. Scenario Logic - Speed Loop
  useEffect(() => {
    if (!isScenarioActive) return;

    const speedInterval = setInterval(() => {
      if (wsRef.current?.readyState !== WS_STATE_OPEN) return;

      const nextSpeed = getNextValue(
        commandRef.current.speed,
        scenarioConfig.speed.min,
        scenarioConfig.speed.max,
        scenarioConfig.speed.volatility,
        1
      );

      commandRef.current.speed = nextSpeed;
      sendCommand('SET_SPEED_NOW', nextSpeed);

    }, scenarioConfig.speed.updateInterval);

    return () => clearInterval(speedInterval);
  }, [isScenarioActive, scenarioConfig.speed, sendCommand]);

  // 5. Scenario Logic - Incline Loop (Independent Timer)
  useEffect(() => {
    if (!isScenarioActive) return;

    const inclineInterval = setInterval(() => {
      if (wsRef.current?.readyState !== WS_STATE_OPEN) return;

      const nextIncline = getNextValue(
        commandRef.current.incline,
        scenarioConfig.incline.min,
        scenarioConfig.incline.max,
        scenarioConfig.incline.volatility,
        1
      );

      commandRef.current.incline = nextIncline;
      sendCommand('SET_INCLINE_NOW', nextIncline);

    }, scenarioConfig.incline.updateInterval);

    return () => clearInterval(inclineInterval);
  }, [isScenarioActive, scenarioConfig.incline, sendCommand]);

  // 6. Data Polling Loop (Needed for some protocols to receive telemetry)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (wsRef.current?.readyState === WS_STATE_OPEN) {
        sendCommand('GET_STATE');
      }
    }, 500); // 2Hz polling
    return () => clearInterval(pollInterval);
  }, [sendCommand]);

  // --- Callbacks ---

  const handlePoseDetected = useCallback((results: Results) => {
    if (isRecording) {
      const frameData: PoseFrameData = {
        timestamp: Date.now(),
        frameId: recordedDataRef.current.length,
        treadmillState: { ...treadmillRef.current }, 
        landmarks: results.poseLandmarks || null
      };

      recordedDataRef.current.push(frameData);
      
      if (recordedDataRef.current.length % 10 === 0) {
        setRecordedCount(recordedDataRef.current.length);
      }
    }
  }, [isRecording]);

  const downloadSession = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(recordedDataRef.current, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `treadmill_pose_session_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const clearSession = () => {
      if (window.confirm("Clear all recorded data?")) {
          recordedDataRef.current = [];
          setRecordedCount(0);
          addLog("Session data cleared", "info");
      }
  };

  const handleUrlSubmit = () => {
      if (inputUrl !== wsUrl) {
          setWsUrl(inputUrl);
          addLog(`Configuration: Switching to ${inputUrl}`, 'info');
      }
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Top Bar */}
      <header className="bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center shadow-md z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
             <span className="font-bold text-lg">T</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Treadmill<span className="text-blue-500">Sync</span></h1>
        </div>
        
        <div className="flex items-center space-x-4">
           {/* Status Indicator */}
           <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${
             wsStatus === WebSocketStatus.CONNECTED ? 'bg-green-900/30 border-green-800 text-green-400' : 
             wsStatus === WebSocketStatus.CONNECTING ? 'bg-yellow-900/30 border-yellow-800 text-yellow-400' :
             'bg-red-900/30 border-red-800 text-red-400'
           }`}>
             {wsStatus === WebSocketStatus.CONNECTED ? <Wifi size={14} /> : <WifiOff size={14} />}
             <span className="text-xs font-semibold uppercase">{wsStatus}</span>
           </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 p-4 grid grid-cols-12 gap-4 h-[calc(100vh-64px)] overflow-hidden">
        
        {/* Left Column: Vision (5/12) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col space-y-4 h-full">
           <div className="flex-1 bg-black rounded-lg overflow-hidden border border-gray-800 relative shadow-2xl">
             <WebcamPose onPoseDetected={handlePoseDetected} isActive={true} />
             
             {/* Overlay for Recording Status */}
             {isRecording && (
               <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full animate-pulse shadow-lg z-20">
                 <div className="w-2 h-2 bg-white rounded-full" />
                 <span className="text-xs font-bold uppercase">REC • {recordedCount} frames</span>
               </div>
             )}
           </div>
           
           {/* Log Console */}
           <div className="h-48 bg-gray-900 rounded-lg border border-gray-800 p-3 overflow-hidden flex flex-col">
             <div className="flex justify-between items-center mb-2">
                 <h3 className="text-xs font-bold text-gray-500 uppercase">System Logs</h3>
                 
                 {/* URL Configuration Input */}
                 <div className="flex items-center bg-gray-950 rounded border border-gray-700 overflow-hidden">
                    <input 
                        type="text" 
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                        placeholder="ws://localhost:8000"
                        className="bg-transparent border-none text-xs text-gray-300 px-2 py-1 w-40 outline-none focus:bg-gray-800 transition-colors"
                    />
                    <button 
                        onClick={handleUrlSubmit}
                        disabled={inputUrl === wsUrl}
                        className={`px-2 py-1 flex items-center justify-center border-l border-gray-700 ${
                            inputUrl === wsUrl 
                            ? 'text-gray-600 cursor-default' 
                            : 'text-blue-400 hover:text-white hover:bg-blue-600/20'
                        }`}
                        title="Set WebSocket URL"
                    >
                        <ArrowRight size={12} strokeWidth={3} />
                    </button>
                 </div>
             </div>
             <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1 pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
               {logs.map((log, i) => (
                 <div key={i} className={`flex space-x-2 ${
                    log.type === 'error' ? 'text-red-400' : 
                    log.type === 'success' ? 'text-green-400' : 
                    log.type === 'tx' ? 'text-blue-400' : 'text-gray-400'
                 }`}>
                   <span className="opacity-50">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                   <span>{log.message}</span>
                 </div>
               ))}
             </div>
           </div>
        </div>

        {/* Right Column: Controls & Data (7/12) */}
        <div className="col-span-12 lg:col-span-7 flex flex-col space-y-4 h-full overflow-y-auto pr-2">
          
          {/* Controls */}
          <ControlPanel 
            config={scenarioConfig}
            onConfigChange={setScenarioConfig}
            isScenarioActive={isScenarioActive}
            toggleScenario={() => setIsScenarioActive(!isScenarioActive)}
            isRecording={isRecording}
            toggleRecording={() => setIsRecording(!isRecording)}
            currentSpeed={displayState.speedKmh}
            currentIncline={displayState.inclinePct}
            sessionCount={recordedCount}
          />

          {/* Charts */}
          <div className="flex-1 min-h-[300px]">
             <LiveCharts data={chartData} />
          </div>

          {/* Data Management Footer */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex justify-between items-center">
             <div className="text-sm text-gray-400">
                Session Frames: <span className="text-white font-mono">{recordedCount}</span>
             </div>
             <div className="space-x-2">
                <button 
                  onClick={clearSession}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                  disabled={recordedCount === 0}
                >
                  Clear Data
                </button>
                <button 
                  onClick={downloadSession}
                  disabled={recordedCount === 0}
                  className={`px-4 py-2 rounded text-sm font-bold flex items-center ${
                      recordedCount === 0 ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  <Download size={16} className="mr-2" />
                  Download JSON
                </button>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;