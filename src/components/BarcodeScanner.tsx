import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Camera, X, CheckCircle, AlertCircle, ScanLine, List, Settings } from 'lucide-react';

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

    let stream: MediaStream;

    try {
      isInitializedRef.current = true;
      setError('');
      setDebugInfo('Initializing camera...');
      console.log('Requesting camera access...');

      codeReaderRef.current = new BrowserMultiFormatReader();

      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30 }
        }
      };

      stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Camera stream received:', stream);
      setDebugInfo('✅ Camera access granted');

      if (!isMountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
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
          const onError = (e: Event) => {
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
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError('Camera initialization failed: ' + errorMessage);
      setDebugInfo('❌ Failed to access camera: ' + errorMessage);
    }
  };

  const startBarcodeScanning = () => {
    if (!codeReaderRef.current || !videoRef.current || !isMountedRef.current) return;

    try {
      setDebugInfo(prev => prev + '\n🔍 Starting barcode detection...');
      codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error) => {
          if (!isMountedRef.current) return;

          setScanAttempts(prev => prev + 1);

          if (result) {
            const scannedValue = result.getText();
            const format = result.getBarcodeFormat();
            setLastScannedCode(scannedValue);
            setDebugInfo(prev => prev + `\n✅ Found: ${scannedValue} (${format})`);

            setScannedCodes(prev => {
              if (!prev.includes(scannedValue)) {
                return [...prev, scannedValue];
              }
              return prev;
            });
          } else if (error) {
            if (scanAttempts % 50 === 0) {
              setDebugInfo(prev => prev + `\n🔍 Scanning... (${scanAttempts} attempts)`);
            }
          }
        }
      );
    } catch (scanError) {
      console.error('Barcode scanning error:', scanError);
      if (!isMountedRef.current) return;
      setError('Scanner error: ' + (scanError as Error).message);
      setDebugInfo(prev => prev + '\n❌ Scanner error: ' + (scanError as Error).message);
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
      streamRef.current.getTracks().forEach(track => {
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
    setScannedCodes(prev => prev.filter((_, i) => i !== index));
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
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div>
              <p className="text-lg font-bold mb-2">Camera Error</p>
              <p>{error}</p>
              <button onClick={retryScanning} className="mt-4 px-4 py-2 bg-blue-600 rounded">Retry</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeScanner;
