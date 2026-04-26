import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { Camera, CheckCircle2, XCircle, Loader2, Scan } from 'lucide-react';

export default function ScanQr() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  const startScanner = async () => {
    setResult(null);
    setError('');
    setScanning(true);

    try {
      const html5Qr = new Html5Qrcode('qr-reader');
      html5QrRef.current = html5Qr;

      await html5Qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await html5Qr.stop();
          setScanning(false);
          await validateToken(decodedText);
        },
        () => {} // ignore scan errors
      );
    } catch (err) {
      setScanning(false);
      setError('Camera access denied or not available. Please ensure permissions are granted.');
    }
  };

  const stopScanner = async () => {
    try {
      if (html5QrRef.current) {
        await html5QrRef.current.stop();
      }
    } catch (_) {}
    setScanning(false);
  };

  const validateToken = async (token) => {
    setLoading(true);
    try {
      const { data } = await api.post('/qr/validate', { token });
      setResult({ success: true, data: data.data });
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.message || 'Validation failed' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  return (
    <div className="max-w-md mx-auto space-y-8 pb-10">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 mb-4">
          <Scan className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-semibold text-text tracking-tight">Guard Scanner</h1>
        <p className="text-text-muted text-sm mt-1.5">Validate digital entry tokens at the campus gate.</p>
      </div>

      <div className="glass-panel p-2 overflow-hidden relative min-h-[400px] flex flex-col">
        {/* Scanner Viewport */}
        <div 
          id="qr-reader" 
          ref={scannerRef} 
          className={`w-full rounded-xl overflow-hidden bg-black ${!scanning ? 'hidden' : 'flex-1'}`}
        />

        <AnimatePresence mode="wait">
          {!scanning && !result && !loading && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="w-24 h-24 rounded-full bg-surface border border-surface-border flex items-center justify-center mb-6 shadow-inner">
                <Camera className="w-10 h-10 text-text-muted opacity-50" />
              </div>
              <p className="text-text font-medium mb-2">Ready to Scan</p>
              <p className="text-sm text-text-muted mb-8">Point the camera at a student&apos;s active QR token.</p>
              <button onClick={startScanner} className="btn-primary w-full">
                Activate Camera
              </button>
            </motion.div>
          )}

          {scanning && (
            <motion.div
              key="scanning-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none z-10 border-4 border-primary/50 rounded-2xl"
            >
              <div className="absolute inset-x-0 h-0.5 bg-primary shadow-[0_0_10px_#3b82f6] animate-[scan_2s_ease-in-out_infinite]" />
              <div className="absolute bottom-4 inset-x-0 text-center pointer-events-auto">
                <button onClick={stopScanner} className="px-4 py-2 bg-black/50 backdrop-blur rounded-full text-sm font-medium text-white hover:bg-black/70 transition-colors">
                  Cancel Scan
                </button>
              </div>
            </motion.div>
          )}

          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-8"
            >
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-text font-medium">Validating Token...</p>
              <p className="text-sm text-text-muted mt-1">Cross-checking database securely</p>
            </motion.div>
          )}

          {result && !loading && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center"
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${result.success ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {result.success ? <CheckCircle2 className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
              </div>
              
              {result.success ? (
                <>
                  <h2 className="text-2xl font-bold text-text mb-1 tracking-tight">{result.data.student_name}</h2>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-surface border border-surface-border text-sm font-medium text-text-muted mb-6">
                    GR: {result.data.gr_number}
                  </div>
                  <p className="text-sm text-emerald-400 font-medium bg-emerald-500/10 px-4 py-2 rounded-lg w-full">
                    Entry Authorized & Logged
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-text mb-2 tracking-tight">Entry Denied</h2>
                  <p className="text-sm text-red-400 font-medium bg-red-500/10 px-4 py-3 rounded-lg w-full mb-6">
                    {result.message}
                  </p>
                </>
              )}

              <button onClick={() => { setResult(null); startScanner(); }} className="btn-primary w-full mt-6">
                Scan Next Student
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}} />
    </div>
  );
}
