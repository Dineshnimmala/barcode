import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import {
  Camera,
  X,
  CheckCircle,
  AlertCircle,
  ScanLine,
  List,
  Settings,
} from 'lucide-react';

interface BarcodeScannerProps {
  onClose: () => void;
  onScan: (results: string[]) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onClose, onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [scanAttempts, setScanAttempts] = useState(0);
  const [showDebug, setShowDebug] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const isInitializedRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    initializeScanner();

    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, []);

  const initializeScanner = async () => {
    if (isInitializedRef.current || !isMountedRef.current) return;

    try {
      isInitializedRef.current = true;
      setError('');
      setDebugInfo('Initializing camera...');
      codeReaderRef.current = new BrowserMultiFormatReader();

      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setDebugInfo('✅ Camera access granted');

      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          const onLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            resolve();
          };
          const onError = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            reject(new Error('Video loading failed'));
          };
          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('error', onError);
        });

        await videoRef.current.play();
        setDebugInfo('🎥 Video stream started');
        setIsScanning(true);
        startBarcodeScanning();
      }
    } catch (err) {
      console.error('❌ Scanner initialization error:', err);
      if (!isMountedRef.current) return;
      setHasPermission(false);
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error';
      setError('Camera initialization failed: ' + errorMessage);
      setDebugInfo('❌ Failed to access camera: ' + errorMessage);
    }
  };

  const startBarcodeScanning = () => {
    if (!codeReaderRef.current || !videoRef.current || !isMountedRef.current)
      return;

    try {
      setDebugInfo((prev) => prev + '\n🔍 Starting barcode detection...');
      codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error) => {
          if (!isMountedRef.current) return;

          setScanAttempts((prev) => prev + 1);

          if (result) {
            const scannedValue = result.getText();
            const format = result.getBarcodeFormat();
            setLastScannedCode(scannedValue);
            setDebugInfo(
              (prev) =>
                prev + `\n✅ Found: ${scannedValue} (${format})`
            );

            setScannedCodes((prev) => {
              if (!prev.includes(scannedValue)) {
                return [...prev, scannedValue];
              }
              return prev;
            });
          } else if (error) {
            if (scanAttempts % 50 === 0) {
              setDebugInfo(
                (prev) => prev + `\n🔍 Scanning... (${scanAttempts} attempts)`
              );
            }
          }
        }
      );
    } catch (scanError) {
      console.error('Barcode scanning error:', scanError);
      if (!isMountedRef.current) return;
      setError(
        'Scanner error: ' + (scanError as Error).message
      );
      setDebugInfo(
        (prev) =>
          prev + '\n❌ Scanner error: ' + (scanError as Error).message
      );
    }
  };

  const cleanup = () => {
    isInitializedRef.current = false;
    setIsScanning(false);

    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (err) {
        console.error('Error resetting code reader:', err);
      }
      codeReaderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleFinishScanning = () => {
    if (scannedCodes.length > 0) {
      onScan(scannedCodes);
    }
  };

  const removeScannedCode = (index: number) => {
    setScannedCodes((prev) => prev.filter((_, i) => i !== index));
  };

  const retryScanning = () => {
    cleanup();
    setTimeout(() => {
      if (isMountedRef.current) {
        initializeScanner();
      }
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
      <div className="relative w-full h-full max-w-md mx-auto bg-black">
        {/* Scanner Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4">
          <div className="flex items-center justify-between text-white mb-2">
            <h2 className="text-lg font-semibold">Scan Barcode</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition"
              >
                <Settings size={18} />
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {showDebug && (
            <div className="bg-gray-800/80 text-xs text-gray-200 p-2 rounded max-h-28 overflow-y-auto whitespace-pre-line">
              {debugInfo || 'Initializing...'}
            </div>
          )}

          {lastScannedCode && (
            <div className="bg-green-600/90 rounded-lg p-2 mt-2 text-white text-sm">
              ✅ Last Scanned: <span className="font-mono">{lastScannedCode}</span>
            </div>
          )}

          {scannedCodes.length > 0 && (
            <div className="flex justify-between items-center bg-blue-600/90 rounded-lg p-2 mt-2 text-white text-sm">
              <span>Scanned: {scannedCodes.length}</span>
              <button
                onClick={handleFinishScanning}
                className="bg-white/20 px-3 py-1 rounded hover:bg-white/30 text-xs"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Camera Feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Scanning Frame */}
        {hasPermission && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-72 h-48 border-2 border-white/70 rounded-lg">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400"></div>

              {isScanning && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse" />
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="absolute bottom-8 left-0 right-0 text-center text-white text-sm">
          <p>Align the barcode within the frame</p>
          <p className="text-xs text-gray-300">
            Hold steady • Ensure good lighting
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-white bg-black/70">
            <div className="text-center">
              <AlertCircle size={32} className="mx-auto text-red-500 mb-2" />
              <p className="text-lg font-bold mb-2">Camera Error</p>
              <p>{error}</p>
              <button
                onClick={retryScanning}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeScanner;
