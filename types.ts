export interface TreadmillState {
  speedKmh: number;
  inclinePct: number;
  timestamp: number;
  isConnected: boolean;
}

export interface ScenarioConfig {
  name: string;
  speed: {
    min: number;
    max: number;
    volatility: number; // Max change per step
    updateInterval: number; // How often to change speed (ms)
  };
  incline: {
    min: number;
    max: number;
    volatility: number;
    updateInterval: number; // How often to change incline (ms)
  };
}

export interface PoseFrameData {
  timestamp: number;
  frameId: number;
  treadmillState: TreadmillState;
  // We store simplified landmarks to save space, or full object if needed
  landmarks: Array<{x: number, y: number, z: number, visibility?: number}> | null;
}

export enum WebSocketStatus {
  DISCONNECTED = 'Disconnected',
  CONNECTING = 'Connecting',
  CONNECTED = 'Connected',
  ERROR = 'Error'
}

export interface LogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'error' | 'success' | 'tx';
}