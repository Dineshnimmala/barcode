import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Camera, X, CheckCircle, AlertCircle, ScanLine, List, Settings, RefreshCw } from 'lucide-react';

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
  const [videoReady, setVideoReady] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<'initializing' | 'requesting' | 'granted' | 'loading' | 'ready' | 'error'>('initializing');
  
  // Refs to manage scanner state
  const streamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const isInitializedRef = useRef(false);
  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Add a small delay to ensure DOM is ready
    const initTimer = setTimeout(() => {
      if (isMountedRef.current) {
        initializeScanner();
      }
    }, 100);
    
    return () => {
      isMountedRef.current = false;
      clearTimeout(initTimer);
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
      setCameraStatus('initializing');
      setDebugInfo('🔄 Initializing camera system...');

      // Check if we're in a secure context (required for camera access)
      if (!window.isSecureContext) {
        throw new Error('Camera requires HTTPS connection');
      }

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available in this browser');
      }

      setCameraStatus('requesting');
      setDebugInfo(prev => prev + '\n📱 Requesting camera permission...');

      // Progressive camera constraints - start with basic, fallback if needed
      const constraintOptions = [
        // Option 1: Ideal settings
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            frameRate: { ideal: 30 }
          },
          audio: false
        },
        // Option 2: Fallback settings
        {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        },
        // Option 3: Basic settings
        {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        },
        // Option 4: Minimal settings
        {
          video: true,
          audio: false
        }
      ];

      let stream: MediaStream | null = null;
      let lastError: Error | null = null;

      // Try each constraint option
      for (let i = 0; i < constraintOptions.length; i++) {
        try {
          setDebugInfo(prev => prev + `\n🎯 Trying camera option ${i + 1}...`);
          stream = await navigator.mediaDevices.getUserMedia(constraintOptions[i]);
          setDebugInfo(prev => prev + `\n✅ Camera option ${i + 1} successful`);
          break;
        } catch (err) {
          lastError = err as Error;
          setDebugInfo(prev => prev + `\n⚠️ Camera option ${i + 1} failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
          continue;
        }
      }

      if (!stream) {
        throw lastError || new Error('Failed to access camera with all constraint options');
      }
      
      if (!isMountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;
      setCameraStatus('granted');
      setHasPermission(true);
      setDebugInfo(prev => prev + '\n✅ Camera access granted successfully');

      // Log stream details for debugging
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        setDebugInfo(prev => prev + `\n📊 Video: ${settings.width}x${settings.height} @ ${settings.frameRate}fps`);
      }

      if (videoRef.current) {
        const video = videoRef.current;
        setCameraStatus('loading');
        setDebugInfo(prev => prev + '\n📺 Setting up video element...');
        
        // Enhanced video setup for Azure deployment
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.controls = false;
        
        // Force video properties for better compatibility
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        
        // Wait for video to be ready with comprehensive event handling
        await new Promise<void>((resolve, reject) => {
          let resolved = false;
          let timeoutId: NodeJS.Timeout;
          
          const onSuccess = () => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timeoutId);
            cleanupListeners();
            setDebugInfo(prev => prev + '\n✅ Video metadata loaded');
            resolve();
          };
          
          const onError = (error: any) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timeoutId);
            cleanupListeners();
            const errorMsg = error?.target?.error?.message || error?.message || 'Video loading failed';
            setDebugInfo(prev => prev + `\n❌ Video error: ${errorMsg}`);
            reject(new Error(errorMsg));
          };
          
          const cleanupListeners = () => {
            video.removeEventListener('loadedmetadata', onSuccess);
            video.removeEventListener('loadeddata', onSuccess);
            video.removeEventListener('canplay', onSuccess);
            video.removeEventListener('canplaythrough', onSuccess);
            video.removeEventListener('error', onError);
            video.removeEventListener('abort', onError);
            video.removeEventListener('stalled', onError);
          };

          // Add multiple event listeners for better compatibility
          video.addEventListener('loadedmetadata', onSuccess);
          video.addEventListener('loadeddata', onSuccess);
          video.addEventListener('canplay', onSuccess);
          video.addEventListener('canplaythrough', onSuccess);
          video.addEventListener('error', onError);
          video.addEventListener('abort', onError);
          video.addEventListener('stalled', onError);
          
          // Extended timeout for slower connections
          timeoutId = setTimeout(() => {
            if (!resolved) {
              // Check if video has some data even if events didn't fire
              if (video.readyState >= 2 || video.videoWidth > 0) {
                setDebugInfo(prev => prev + '\n⏰ Video ready via timeout check');
                onSuccess();
              } else {
                onError(new Error('Video loading timeout - no data received'));
              }
            }
          }, 8000); // Increased timeout for Azure deployment
        });

        if (!isMountedRef.current) return;

        // Attempt to play video with multiple strategies
        let playSuccess = false;
        const playStrategies = [
          // Strategy 1: Direct play
          async () => {
            await video.play();
          },
          // Strategy 2: Play with user interaction simulation
          async () => {
            video.muted = true;
            await video.play();
          },
          // Strategy 3: Load and play
          async () => {
            video.load();
            await new Promise(resolve => setTimeout(resolve, 500));
            await video.play();
          }
        ];

        for (let i = 0; i < playStrategies.length; i++) {
          try {
            setDebugInfo(prev => prev + `\n▶️ Trying play strategy ${i + 1}...`);
            await playStrategies[i]();
            playSuccess = true;
            setDebugInfo(prev => prev + `\n✅ Play strategy ${i + 1} successful`);
            break;
          } catch (playError) {
            setDebugInfo(prev => prev + `\n⚠️ Play strategy ${i + 1} failed: ${playError instanceof Error ? playError.message : 'Unknown error'}`);
            if (i === playStrategies.length - 1) {
              console.warn('All play strategies failed, but continuing...', playError);
              // Continue anyway - sometimes video plays despite errors
              playSuccess = true;
            }
          }
        }

        if (!isMountedRef.current) return;

        // Final video ready check
        const checkVideoReady = () => {
          if (video.videoWidth > 0 && video.videoHeight > 0 && !video.paused) {
            setCameraStatus('ready');
            setVideoReady(true);
            setDebugInfo(prev => prev + `\n🎬 Video ready: ${video.videoWidth}x${video.videoHeight}`);
            
            // Start barcode scanning after a short delay
            setTimeout(() => {
              if (isMountedRef.current) {
                startBarcodeScanning();
              }
            }, 1000);
          } else {
            // Retry check after a delay
            setTimeout(checkVideoReady, 500);
          }
        };

        checkVideoReady();
      }
    } catch (err) {
      console.error('Scanner initialization error:', err);
      if (!isMountedRef.current) return;
      
      isInitializedRef.current = false;
      setCameraStatus('error');
      setHasPermission(false);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError('Camera initialization failed: ' + errorMessage);
      setDebugInfo(prev => prev + '\n❌ Initialization error: ' + errorMessage);
    }
  };

  const startBarcodeScanning = () => {
    if (!codeReaderRef.current && isMountedRef.current) {
      codeReaderRef.current = new BrowserMultiFormatReader();
    }

    if (!codeReaderRef.current || !videoRef.current || !isMountedRef.current) {
      return;
    }

    try {
      setIsScanning(true);
      setDebugInfo(prev => prev + '\n🎯 Starting barcode detection...');
      
      // Use decodeFromVideoDevice with enhanced error handling
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
            setDebugInfo(prev => prev + `\n✅ Detected: ${scannedValue} (${format})`);
            
            // Add to scanned codes if not already present
            setScannedCodes(prev => {
              if (!prev.includes(scannedValue)) {
                return [...prev, scannedValue];
              }
              return prev;
            });
          } else if (error && scanAttempts % 100 === 0) {
            // Periodic status update
            setDebugInfo(prev => prev + `\n🔍 Scanning active... (${scanAttempts} attempts)`);
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
    setVideoReady(false);
    setCameraStatus('initializing');
    
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
      videoRef.current.load();
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
    retryCountRef.current += 1;
    setDebugInfo(prev => prev + `\n🔄 Retry attempt ${retryCountRef.current}...`);
    cleanup();
    setTimeout(() => {
      if (isMountedRef.current) {
        initializeScanner();
      }
    }, 1000);
  };

  const getCameraStatusText = () => {
    switch (cameraStatus) {
      case 'initializing': return 'Initializing camera system...';
      case 'requesting': return 'Requesting camera permission...';
      case 'granted': return 'Camera permission granted';
      case 'loading': return 'Loading video stream...';
      case 'ready': return 'Camera ready';
      case 'error': return 'Camera error occurred';
      default: return 'Unknown status';
    }
  };

  const getCameraStatusColor = () => {
    switch (cameraStatus) {
      case 'ready': return 'bg-green-400';
      case 'error': return 'bg-red-400';
      case 'granted':
      case 'loading': return 'bg-yellow-400';
      default: return 'bg-gray-400';
    }
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
          
          {/* Enhanced Status Indicator */}
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${getCameraStatusColor()} ${
              cameraStatus === 'loading' || cameraStatus === 'requesting' ? 'animate-pulse' : ''
            }`}></div>
            <span className="text-xs text-gray-300">{getCameraStatusText()}</span>
            {retryCountRef.current > 0 && (
              <span className="text-xs text-yellow-300">(Retry #{retryCountRef.current})</span>
            )}
          </div>
          
          {/* Debug Info */}
          {showDebug && (
            <div className="bg-gray-900/90 rounded-lg p-3 mb-2 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-300">Debug Info:</span>
                <div className="flex items-center gap-2">
                  <span className="text-blue-300">Attempts: {scanAttempts}</span>
                  <span className="text-purple-300">Status: {cameraStatus}</span>
                </div>
              </div>
              <div className="text-gray-200 max-h-24 overflow-y-auto whitespace-pre-line text-xs">
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
          {/* Permission Request State */}
          {hasPermission === null && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-lg mb-2">Setting up camera...</p>
                <p className="text-sm text-gray-300">Please allow camera permission when prompted</p>
                <p className="text-xs text-gray-400 mt-2">Status: {getCameraStatusText()}</p>
              </div>
            </div>
          )}

          {/* Permission Denied State */}
          {hasPermission === false && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="text-center text-white">
                <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
                <h3 className="text-lg font-semibold mb-2">Camera Access Issue</h3>
                <p className="text-sm text-gray-300 mb-4">
                  {error || 'Unable to access camera. Please check permissions and try again.'}
                </p>
                <div className="space-y-2">
                  <button
                    onClick={retryScanning}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Try Again
                  </button>
                  <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors text-sm"
                  >
                    {showDebug ? 'Hide' : 'Show'} Debug Info
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Camera Active State */}
          {hasPermission && (
            <>
              {/* Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                controls={false}
                className={`w-full h-full object-cover transition-opacity duration-1000 ${
                  videoReady ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ 
                  transform: 'scaleX(-1)',
                  backgroundColor: '#000'
                }}
                onLoadedData={() => {
                  setDebugInfo(prev => prev + '\n📺 Video onLoadedData event');
                }}
                onCanPlay={() => {
                  setDebugInfo(prev => prev + '\n▶️ Video onCanPlay event');
                }}
                onPlaying={() => {
                  setDebugInfo(prev => prev + '\n🎬 Video onPlaying event');
                }}
                onError={(e) => {
                  const error = (e.target as HTMLVideoElement).error;
                  const errorMsg = error ? `${error.code}: ${error.message}` : 'Unknown video error';
                  console.error('Video error:', errorMsg);
                  setDebugInfo(prev => prev + `\n❌ Video error: ${errorMsg}`);
                }}
              />
              
              {/* Loading overlay while video is not ready */}
              {!videoReady && cameraStatus !== 'error' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="text-center text-white">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg mb-2">Loading camera view...</p>
                    <p className="text-sm text-gray-300 mb-2">{getCameraStatusText()}</p>
                    <p className="text-xs text-gray-400">This may take a few moments on first load</p>
                    {cameraStatus === 'loading' && (
                      <div className="mt-4">
                        <button
                          onClick={retryScanning}
                          className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm"
                        >
                          Retry if stuck
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Scanner Overlay - only show when video is ready */}
              {videoReady && (
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
              )}
            </>
          )}

          {/* Error Display */}
          {error && (
            <div className="absolute bottom-4 left-4 right-4 bg-red-600/90 text-white p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle size={16} className="mr-2 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
                <button
                  onClick={retryScanning}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs flex-shrink-0 ml-2"
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
        {scanAttempts > 100 && scannedCodes.length === 0 && videoReady && (
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
