import React, { useEffect, useRef, useState } from 'react';
import type { Results } from '@mediapipe/pose';
import * as PoseLib from '@mediapipe/pose';
import * as CameraLib from '@mediapipe/camera_utils';
import * as DrawingLib from '@mediapipe/drawing_utils';
import { CameraOff, Camera as CameraIcon } from 'lucide-react';

interface WebcamPoseProps {
  onPoseDetected: (results: Results) => void;
  isActive: boolean;
}

const WebcamPose: React.FC<WebcamPoseProps> = ({ onPoseDetected, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let camera: any = null;
    let pose: any = null;

    const setupMediaPipe = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      try {
        // Resolve module exports safely for CDN compatibility
        // @ts-ignore
        const Pose = PoseLib.Pose || PoseLib.default?.Pose || PoseLib.default;
        // @ts-ignore
        const Camera = CameraLib.Camera || CameraLib.default?.Camera || CameraLib.default;
        
        // Drawing utils
        // @ts-ignore
        const drawConnectors = DrawingLib.drawConnectors || DrawingLib.default?.drawConnectors;
        // @ts-ignore
        const drawLandmarks = DrawingLib.drawLandmarks || DrawingLib.default?.drawLandmarks;
        // @ts-ignore
        const POSE_CONNECTIONS = DrawingLib.POSE_CONNECTIONS || DrawingLib.default?.POSE_CONNECTIONS;

        if (!Pose) throw new Error("Could not load @mediapipe/pose");
        if (!Camera) throw new Error("Could not load @mediapipe/camera_utils");

        pose = new Pose({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
          },
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        pose.onResults((results: Results) => {
          onPoseDetected(results);
          
          // Draw on canvas
          const canvasCtx = canvasRef.current?.getContext('2d');
          if (canvasCtx && canvasRef.current && results.image) {
            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            
            // Draw video frame
            canvasCtx.drawImage(
              results.image, 0, 0, canvasRef.current.width, canvasRef.current.height
            );

            // Draw skeleton
            if (results.poseLandmarks && drawConnectors && drawLandmarks) {
              drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
                color: '#00FF00',
                lineWidth: 4
              });
              drawLandmarks(canvasCtx, results.poseLandmarks, {
                color: '#FF0000',
                lineWidth: 2,
                radius: 3
              });
            }
            canvasCtx.restore();
          }
        });

        if (isActive) {
           camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && pose) {
                await pose.send({ image: videoRef.current });
              }
            },
            width: 640,
            height: 480,
          });
          await camera.start();
          setIsCameraReady(true);
        }

      } catch (err) {
        console.error("MediaPipe error:", err);
        setError("Failed to initialize camera or pose model.");
      }
    };

    setupMediaPipe();

    return () => {
      if (camera) camera.stop();
      if (pose) pose.close();
    };
  }, [isActive, onPoseDetected]);

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden border border-gray-800 shadow-xl flex items-center justify-center">
      {!isActive && (
        <div className="flex flex-col items-center text-gray-500">
          <CameraOff size={48} className="mb-2" />
          <p>Camera Inactive</p>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 text-white p-4 text-center z-20">
          {error}
        </div>
      )}

      {/* Hidden Video Element for MediaPipe Input */}
      <video
        ref={videoRef}
        className="hidden"
        width="640"
        height="480"
        playsInline
      />

      {/* Visible Canvas for Drawing Output */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-cover ${isActive ? 'block' : 'hidden'}`}
        width="640"
        height="480"
      />
      
      {isActive && !isCameraReady && !error && (
         <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-blue-400 z-10">
           <div className="animate-spin mr-2">
             <CameraIcon size={24} />
           </div>
           Initializing Vision Model...
         </div>
      )}
    </div>
  );
};

export default WebcamPose;