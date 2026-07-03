import React, { useState } from 'react';
import { motion } from 'motion/react';
import { API_BASE_URL } from '../config';

interface GDPRConsentModalProps {
  userConsentKey: string;
  onConsentGiven: () => void;
}

const GDPRConsentModal = ({ userConsentKey, onConsentGiven }: GDPRConsentModalProps) => {
  const [consentType, setConsentType] = useState('all'); // all | essential | custom
  const [customConsent, setCustomConsent] = useState({
    analytics: false,
    marketing: false,
    thirdParty: false
  });

  const persistConsent = async (consentData: any) => {
    const enrichedConsent = {
      ...consentData,
      acceptedAt: new Date().toISOString(),
      userConsentKey,
      version: '2.0'
    };

    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        await fetch(`${API_BASE_URL}/auth/saveGDPRConsent`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(enrichedConsent)
        });
      }

      localStorage.setItem(userConsentKey, JSON.stringify(enrichedConsent));
      onConsentGiven();
    } catch (error) {
      console.error('Error saving consent:', error);
      localStorage.setItem(userConsentKey, JSON.stringify(enrichedConsent));
      onConsentGiven();
    }
  };

  const handleAcceptAll = async () => {
    const consentData = {
      accepted: true,
      gdprConsent: true,
      analyticsConsent: true,
      cookiesConsent: true,
      marketingConsent: true,
      thirdPartyConsent: true
    };

    await persistConsent(consentData);
  };

  const handleRejectAll = async () => {
    const consentData = {
      accepted: true,
      gdprConsent: true,
      analyticsConsent: false,
      cookiesConsent: false,
      marketingConsent: false,
      thirdPartyConsent: false
    };

    await persistConsent(consentData);
  };

  const handleCustomConsent = async () => {
    const consentData = {
      accepted: true,
      gdprConsent: true,
      analyticsConsent: customConsent.analytics,
      cookiesConsent: customConsent.analytics || customConsent.marketing,
      marketingConsent: customConsent.marketing,
      thirdPartyConsent: customConsent.thirdParty
    };

    await persistConsent(consentData);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[120] bg-black text-white flex items-center justify-center p-4 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <div className="absolute top-[-20%] left-[20%] h-[22rem] w-[22rem] rounded-full bg-[#FF5530]/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[10%] h-[20rem] w-[20rem] rounded-full bg-[#1D9BF0]/15 blur-[120px]" />
      </motion.div>

      <motion.div
        className="relative w-full max-w-3xl rounded-2xl border border-white/15 bg-[#0d0d0d]/95 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.65)] overflow-hidden"
        initial={{ opacity: 0, y: 22, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="border-b border-white/10 bg-gradient-to-r from-[#101010] via-[#151515] to-[#111111] px-6 py-5 md:px-8">
          <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-white/15 bg-black/40 px-3 py-1.5">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#FF5530] text-[11px] font-bold text-white">M</span>
            <span
              className="text-xs tracking-[0.18em] text-white/85"
              style={{ fontFamily: 'Carella, "Netflix Sans", "Segoe UI", sans-serif' }}
            >
              MENTORA
            </span>
          </div>
          <p className="text-xs uppercase tracking-[0.18em] text-white/60">Privacy Center</p>
          <h2 className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight">
            Cookie Preferences
          </h2>
          <p className="mt-2 text-sm text-white/70">
            This step appears once per account. Choose how Mentora can use non-essential data.
          </p>
        </div>

        <div className="px-6 py-5 md:px-8 md:py-6 space-y-4">
          {consentType === 'all' && (
            <>
              <p className="text-sm text-white/80">
                We use cookies to run the platform, understand performance, and deliver personalized recommendations.
              </p>

              <ul className="text-sm space-y-2 text-white/70">
                <li className="flex items-center gap-2">
                  <span>✅</span> Essential cookies (required)
                </li>
                <li className="flex items-center gap-2">
                  <span>📊</span> Analytics (usage and performance)
                </li>
                <li className="flex items-center gap-2">
                  <span>🎯</span> Marketing (personalized content)
                </li>
                <li className="flex items-center gap-2">
                  <span>🔌</span> Third-party integrations (extended features)
                </li>
              </ul>

              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/75">
                <p>
                  <strong>Your data:</strong> We never sell personal data. See our{' '}
                  <a href="/privacy-policy" className="text-[#86c7ff] hover:underline">
                    Privacy Policy
                  </a>{' '}
                  for details.
                </p>
              </div>
            </>
          )}

          {consentType === 'essential' && (
            <>
              <p className="text-sm text-white/80">
                We will enable only strictly necessary cookies for security and core functionality.
              </p>
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-600/10 p-3 text-xs">
                <p className="text-emerald-200">
                  ✅ Essential cookies only
                </p>
              </div>
            </>
          )}

          {consentType === 'custom' && (
            <>
              <p className="text-sm text-white/80 mb-3">Customize your preferences:</p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer text-white/80">
                  <input
                    type="checkbox"
                    checked={customConsent.analytics}
                    onChange={(e) =>
                      setCustomConsent({ ...customConsent, analytics: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#FF5530]"
                  />
                  <span className="text-sm">
                    <strong>Analytics</strong> - measure usage insights
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer text-white/80">
                  <input
                    type="checkbox"
                    checked={customConsent.marketing}
                    onChange={(e) =>
                      setCustomConsent({ ...customConsent, marketing: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#FF5530]"
                  />
                  <span className="text-sm">
                    <strong>Marketing</strong> - personalize recommendations
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer text-white/80">
                  <input
                    type="checkbox"
                    checked={customConsent.thirdParty}
                    onChange={(e) =>
                      setCustomConsent({ ...customConsent, thirdParty: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#FF5530]"
                  />
                  <span className="text-sm">
                    <strong>Third-party</strong> - enable partner services
                  </span>
                </label>
              </div>
            </>
          )}

          <div className="grid grid-cols-3 gap-2 mt-2 mb-1">
            {['all', 'essential', 'custom'].map((type) => (
              <button
                key={type}
                onClick={() => setConsentType(type)}
                className={`py-2 px-2 rounded-md text-xs font-medium transition-colors border ${
                  consentType === type
                    ? 'bg-[#FF5530] border-[#FF5530] text-white'
                    : 'bg-transparent border-white/20 text-white/70 hover:border-white/40 hover:text-white'
                }`}
              >
                {type === 'all' ? 'All' : type === 'essential' ? 'Essential' : 'Custom'}
              </button>
            ))}
          </div>

          <div className="flex gap-2 text-xs text-white/55">
            <a href="/privacy-policy" className="hover:text-white hover:underline">
              Privacy Policy
            </a>
            <span>•</span>
            <a href="/cookie-policy" className="hover:text-white hover:underline">
              Cookie Policy
            </a>
            <span>•</span>
            <a href="/terms" className="hover:text-white hover:underline">
              Terms
            </a>
          </div>
        </div>

        <div className="border-t border-white/10 bg-black/30 p-4 md:px-8 md:py-5 space-y-2">
          {consentType === 'custom' ? (
            <>
              <button
                onClick={handleCustomConsent}
                className="w-full bg-[#FF5530] text-white py-2 rounded-md text-sm font-semibold hover:bg-[#ff6d4d] transition-colors"
              >
                Save Preferences
              </button>
              <button
                onClick={handleRejectAll}
                className="w-full border border-white/25 text-white/85 py-2 rounded-md text-sm hover:bg-white/10 transition-colors"
              >
                Reject All
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleAcceptAll}
                className="w-full bg-[#FF5530] text-white py-2 rounded-md text-sm font-semibold hover:bg-[#ff6d4d] transition-colors"
              >
                {consentType === 'all' ? 'Accept All' : 'Accept Essential Only'}
              </button>
              <button
                onClick={() => setConsentType('custom')}
                className="w-full text-white/75 py-2 text-sm hover:underline hover:text-white transition-colors"
              >
                Customize
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export { GDPRConsentModal };
