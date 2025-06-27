import React from 'react';
import { CheckCircle, Copy, Scan, X, List } from 'lucide-react';

interface ScanResultProps {
  results: string[];
  onClose: () => void;
  onScanAgain: () => void;
}

const ScanResult: React.FC<ScanResultProps> = ({ results, onClose, onScanAgain }) => {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyAllToClipboard = async () => {
    try {
      const allResults = results.map((result, index) => `Barcode ${index + 1}: ${result}`).join('\n');
      await navigator.clipboard.writeText(allResults);
    } catch (err) {
      console.error('Failed to copy all:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-auto animate-scale-in max-h-[90vh] overflow-hidden flex flex-col">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {results.length === 1 ? 'Barcode Scanned!' : `${results.length} Barcodes Scanned!`}
          </h2>
          <p className="text-gray-600">
            {results.length === 1 ? 'Successfully detected barcode' : 'Successfully detected multiple barcodes'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto mb-6">
          {results.length === 1 ? (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Scanned Value:</span>
                <button
                  onClick={() => copyToClipboard(results[0])}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy size={16} className="text-gray-500" />
                </button>
              </div>
              <div className="bg-white rounded-lg p-3 border-2 border-dashed border-gray-300">
                <p className="text-gray-900 font-mono text-sm break-all">{results[0]}</p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <List size={18} className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Scanned Values:</span>
                </div>
                <button
                  onClick={copyAllToClipboard}
                  className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium rounded-md transition-colors flex items-center gap-1"
                  title="Copy all to clipboard"
                >
                  <Copy size={12} />
                  Copy All
                </button>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {results.map((result, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600">Barcode {index + 1}:</span>
                      <button
                        onClick={() => copyToClipboard(result)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Copy to clipboard"
                      >
                        <Copy size={12} className="text-gray-500" />
                      </button>
                    </div>
                    <p className="text-gray-900 font-mono text-sm break-all">{result}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onScanAgain}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Scan size={18} />
            Scan Again
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <X size={18} />
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScanResult;