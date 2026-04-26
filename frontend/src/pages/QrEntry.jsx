import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { QrCode, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils/cn';

export default function QrEntry() {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const generateQr = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/qr/generate');
      setQrData(data.data);
      setCountdown(45);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate QR');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setQrData(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  return (
    <div className="max-w-md mx-auto space-y-8 pb-10">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
          <QrCode className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-semibold text-text tracking-tight">Digital Gate Entry</h1>
        <p className="text-text-muted text-sm mt-1.5">Generate a secure, single-use token to enter campus.</p>
      </div>

      <motion.div layout className="glass-panel p-8 text-center relative overflow-hidden">
        <AnimatePresence mode="wait">
          {qrData && countdown > 0 ? (
            <motion.div
              key="active-qr"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-8 relative z-10"
            >
              <div className="inline-flex p-4 bg-white rounded-2xl shadow-2xl shadow-white/5 ring-4 ring-white/10">
                <QRCodeSVG
                  value={qrData.token}
                  size={240}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#09090b"
                />
              </div>

              <div>
                <div className="flex items-center justify-center gap-2 text-text font-medium mb-3">
                  <span className="text-4xl tracking-tighter tabular-nums">{countdown}</span>
                  <span className="text-text-muted mt-2">seconds</span>
                </div>
                <div className="w-full bg-surface-border rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="bg-primary h-full"
                    initial={{ width: '100%' }}
                    animate={{ width: `${(countdown / 45) * 100}%` }}
                    transition={{ ease: 'linear', duration: 1 }}
                  />
                </div>
                <p className="text-xs text-text-muted mt-4 uppercase tracking-widest font-medium">Auto-expires</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="generate-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-10 space-y-6 relative z-10"
            >
              <div className="w-24 h-24 rounded-full bg-surface border border-surface-border flex items-center justify-center mx-auto shadow-inner">
                <QrCode className="w-10 h-10 text-text-muted opacity-50" />
              </div>
              <div>
                <p className="text-text font-medium mb-1">
                  {countdown === 0 && qrData ? 'Token Expired' : 'Ready to Generate'}
                </p>
                <p className="text-sm text-text-muted px-4">
                  Tokens are valid for 45 seconds to prevent sharing.
                </p>
              </div>
              <button onClick={generateQr} disabled={loading} className="btn-primary">
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>Generate New Token</>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ambient glow behind card contents */}
        {qrData && countdown > 0 && (
          <div className="absolute inset-0 bg-primary/5 blur-[100px] pointer-events-none" />
        )}
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </motion.div>
      )}

      <div className="px-2">
        <h3 className="text-sm font-semibold text-text mb-4 tracking-wide uppercase">Instructions</h3>
        <ul className="space-y-4">
          {[
            'Tap "Generate New Token" when you are near the gate.',
            'Hold your screen brightness up.',
            'Present the QR code to the scanner or guard device.'
          ].map((text, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-text-muted">
              <div className="w-5 h-5 rounded-full bg-surface border border-surface-border flex items-center justify-center text-xs font-medium text-text shrink-0 mt-0.5">
                {i + 1}
              </div>
              <p>{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
