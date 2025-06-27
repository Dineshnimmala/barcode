import React, { useState } from 'react';
import { Scan, Camera, Zap, Shield, Smartphone } from 'lucide-react';
import BarcodeScanner from './components/BarcodeScanner';
import ScanResult from './components/ScanResult';

function App() {
  const [showScanner, setShowScanner] = useState(false);
  const [scanResults, setScanResults] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);

  const handleGetStarted = () => {
    setShowScanner(true);
  };

  const handleScan = (results: string[]) => {
    setScanResults(results);
    setShowScanner(false);
    setShowResult(true);
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setScanResults([]);
  };

  const handleScanAgain = () => {
    setShowResult(false);
    setScanResults([]);
    setShowScanner(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Scan className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">ScanCode</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-8 shadow-lg">
              <Scan className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Scan Multiple Barcodes
              </span>
              <br />
              Instantly
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Powerful barcode scanning directly in your browser. Scan single or multiple barcodes with real-time detection. 
              Fast, secure, and works on any device with a camera.
            </p>
            
            <button
              onClick={handleGetStarted}
              className="group inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-4 rounded-2xl text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <Camera className="w-6 h-6 group-hover:animate-pulse" />
              Start Scanning
            </button>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-400/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-purple-400/10 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose ScanCode?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience the next generation of barcode scanning with our advanced features
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group text-center p-8 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Lightning Fast</h3>
              <p className="text-gray-600 leading-relaxed">
                Instant barcode recognition with real-time display. Scan multiple barcodes in seconds with live feedback.
              </p>
            </div>

            <div className="group text-center p-8 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Secure & Private</h3>
              <p className="text-gray-600 leading-relaxed">
                All scanning happens locally in your browser. Your data never leaves your device.
              </p>
            </div>

            <div className="group text-center p-8 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Multi-Scan Support</h3>
              <p className="text-gray-600 leading-relaxed">
                Scan multiple barcodes in one session. Perfect for inventory management and bulk scanning tasks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Start Scanning?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users who trust ScanCode for their barcode scanning needs
          </p>
          <button
            onClick={handleGetStarted}
            className="inline-flex items-center gap-3 bg-white hover:bg-gray-50 text-blue-600 font-semibold px-8 py-4 rounded-2xl text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <Camera className="w-6 h-6" />
            Start Scanning Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Scan className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">ScanCode</span>
            </div>
            <p className="text-gray-400">
              © 2025 ScanCode. Built with modern web technologies.
            </p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showScanner && (
        <BarcodeScanner
          onClose={handleCloseScanner}
          onScan={handleScan}
        />
      )}

      {showResult && (
        <ScanResult
          results={scanResults}
          onClose={handleCloseResult}
          onScanAgain={handleScanAgain}
        />
      )}
    </div>
  );
}

export default App;