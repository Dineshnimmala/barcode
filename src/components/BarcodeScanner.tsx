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
  
  // Refs to manage scanner state
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
    if (isInitializedRef.current || !isMountedRef.current) {
      return;
    }

    try {
      isInitializedRef.current = true;
      setError('');
      setDebugInfo('Initializing camera...');

      // Create code reader instance
      codeReaderRef.current = new BrowserMultiFormatReader();

      // Request camera access
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30 }
        }
      };

console.log('Requesting camera access...');

try {
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
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

    // Wait for video to be ready
    await new Promise<void>((resolve, reject) => {
      if (!videoRef.current) {
        reject(new Error('Video element not available'));
        return;
      }

      const video = videoRef.current;

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
  console.error('❌ Error getting camera:', err);
  if (!isMountedRef.current) return;
  setHasPermission(false);
  const errorMessage = err instanceof Error ? err.message : 'Unknown error';
  setError('Camera initialization failed: ' + errorMessage);
  setDebugInfo('❌ Failed to access camera: ' + errorMessage);
}

      
      if (!isMountedRef.current) {
        // Component unmounted, cleanup
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;
      setHasPermission(true);
      setDebugInfo('Camera access granted');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not available'));
            return;
          }

          const video = videoRef.current;
          
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

        // Play video
        await videoRef.current.play();
        
        if (!isMountedRef.current) return;

        setDebugInfo('Video playing, starting scanner...');
        setIsScanning(true);

        // Start barcode scanning
        startBarcodeScanning();
      }
    } catch (err) {
      console.error('Scanner initialization error:', err);
      if (!isMountedRef.current) return;
      
      isInitializedRef.current = false;
      setHasPermission(false);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError('Camera initialization failed: ' + errorMessage);
      setDebugInfo('❌ Error: ' + errorMessage);
    }
  };

  const startBarcodeScanning = () => {
    if (!codeReaderRef.current || !videoRef.current || !isMountedRef.current) {
      return;
    }

    try {
      setDebugInfo(prev => prev + '\n🔍 Starting barcode detection...');
      
      // Use decodeFromVideoDevice with proper error handling
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
            
            // Add to scanned codes if not already present
            setScannedCodes(prev => {
              if (!prev.includes(scannedValue)) {
                return [...prev, scannedValue];
              }
              return prev;
            });
          } else if (error) {
            // Only log errors occasionally to avoid spam
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
    
    // Stop code reader
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (err) {
        console.error('Error resetting code reader:', err);
      }
      codeReaderRef.current = null;
    }
    
    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }

    // Clear video element
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
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/90 to-transparent p-4">
          <div className="flex items-center justify-between text-white mb-2">
            <h2 className="text-lg font-semibold">Scan Barcodes</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                title="Debug Info"
              >
                <Settings size={16} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                title="Close Scanner"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          {/* Debug Info */}
          {showDebug && (
            <div className="bg-gray-900/90 rounded-lg p-3 mb-2 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-300">Debug Info:</span>
                <span className="text-blue-300">Attempts: {scanAttempts}</span>
              </div>
              <div className="text-gray-200 max-h-20 overflow-y-auto whitespace-pre-line">
                {debugInfo || 'Initializing...'}
              </div>
            </div>
          )}
          
          {/* Current scan display */}
          {lastScannedCode && (
            <div className="bg-green-600/90 rounded-lg p-2 mb-2">
              <p className="text-xs text-green-100">Last Scanned:</p>
              <p className="text-sm font-mono text-white truncate">{lastScannedCode}</p>
            </div>
          )}
          
          {/* Scanned codes counter */}
          {scannedCodes.length > 0 && (
            <div className="flex items-center justify-between bg-blue-600/90 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <List size={16} />
                <span className="text-sm">Scanned: {scannedCodes.length}</span>
              </div>
              <button
                onClick={handleFinishScanning}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-md text-xs font-medium transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Camera View */}
        <div className="relative w-full h-full">
          {hasPermission === null && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <Camera size={48} className="mx-auto mb-4 animate-pulse" />
                <p className="text-lg mb-2">Requesting camera access...</p>
                <p className="text-sm text-gray-300">Please allow camera permission</p>
              </div>
            </div>
          )}

          {hasPermission === false && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="text-center text-white">
                <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
                <h3 className="text-lg font-semibold mb-2">Camera Access Denied</h3>
                <p className="text-sm text-gray-300 mb-4">
                  Please allow camera access to scan barcodes. You may need to refresh the page and try again.
                </p>
                <button
                  onClick={retryScanning}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {hasPermission && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              
              {/* Scanner Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Scanning Frame */}
                  <div className="w-80 h-52 border-2 border-white/70 rounded-lg relative">
                    {/* Corner indicators */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg"></div>
                    
                    {/* Scanning line animation */}
                    {isScanning && (
                      <div className="absolute inset-0 overflow-hidden rounded-lg">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse"></div>
                        <ScanLine className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-400 animate-pulse" size={32} />
                      </div>
                    )}
                  </div>
                  
                  {/* Instructions */}
                  <div className="absolute -bottom-28 left-1/2 transform -translate-x-1/2 text-center">
                    <p className="text-white text-sm mb-1 font-medium">
                      Position barcode within the frame
                    </p>
                    <p className="text-blue-300 text-xs mb-2">
                      Hold steady • Ensure good lighting • Try different angles
                    </p>
                    {scanAttempts > 50 && scannedCodes.length === 0 && (
                      <div className="bg-yellow-600/80 rounded-lg p-2 mt-2">
                        <p className="text-yellow-100 text-xs">
                          💡 Try: Move closer/further, better lighting, or different angle
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="absolute bottom-4 left-4 right-4 bg-red-600/90 text-white p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle size={16} className="mr-2" />
                  <span className="text-sm">{error}</span>
                </div>
                <button
                  onClick={retryScanning}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scanned codes list overlay */}
        {scannedCodes.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 max-h-32 overflow-y-auto">
            <h4 className="text-white text-sm font-medium mb-2">Scanned Codes:</h4>
            <div className="space-y-1">
              {scannedCodes.map((code, index) => (
                <div key={index} className="flex items-center justify-between bg-white/10 rounded p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300">Barcode {index + 1}:</p>
                    <p className="text-sm text-white font-mono truncate">{code}</p>
                  </div>
                  <button
                    onClick={() => removeScannedCode(index)}
                    className="ml-2 p-1 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help overlay for scanning issues */}
        {scanAttempts > 100 && scannedCodes.length === 0 && (
          <div className="absolute top-1/2 left-4 right-4 transform -translate-y-1/2 bg-yellow-600/90 text-white p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Trouble scanning?</h4>
            <ul className="text-sm space-y-1 mb-3">
              <li>• Ensure barcode is clear and undamaged</li>
              <li>• Try different distances (6-12 inches)</li>
              <li>• Improve lighting conditions</li>
              <li>• Hold device steady</li>
              <li>• Clean camera lens</li>
            </ul>
            <button
              onClick={retryScanning}
              className="w-full px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              Restart Scanner
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeScanner;
