/**
 * B2 Storage Monitor
 *
 * Premium widget that visualises Backblaze B2 bucket usage against the
 * free-tier quota (10 GB by default), showing remaining free bytes,
 * estimated monthly cost, per-prefix breakdown, and optimisation tips.
 *
 * Features a bold, colorful progress bar:
 *   - Fills with a gradient color up to how much is used
 *   - When over the free limit, shows the overage in red
 *   - Clear labels showing used / total / remaining
 *
 * Reused by the Admin Panel header (always-visible) and the Analytics tab.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HardDrive,
  AlertTriangle,
  CheckCircle,
  Info,
  Film,
  Image,
  Layers,
  PlayCircle,
  Users,
  Database,
  DollarSign,
  Shield,
  Server,
  Trash2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { formatBytes } from '../../utils/format';
import { apiService } from '../../utils/api';

// ============================================================================
// Types
// ============================================================================

export interface StorageBreakdownItem {
  prefix: string;
  bytes: number;
  count: number;
}

export interface StorageData {
  provider?: string;
  bucketName?: string;
  usedBytes?: number;
  usagePercent?: number;
  warningLevel?: 'safe' | 'caution' | 'warning' | 'critical';
  historicalOverhead?: number;
  breakdown?: StorageBreakdownItem[];
  tips?: string[];
  currentObjects?: {
    count?: number;
    bytes?: number;
  };
  versions?: {
    count?: number;
    deleteMarkers?: number;
    bytes?: number;
  };
  quota?: {
    freeBytes?: number;
    remainingFreeBytes?: number;
    billableBytes?: number;
    pricePerGbMonth?: number;
    estimatedMonthlyCost?: number;
  };
}

interface B2StorageMonitorProps {
  storage?: StorageData;
  loading?: boolean;
  onRefresh?: () => void;
  /** Compact mode collapses some sections for the persistent header widget. */
  compact?: boolean;
}

// ============================================================================
// Local constants
// ============================================================================

const BREAKDOWN_ICONS: Record<string, any> = {
  videos: Film,
  thumbnails: Image,
  hls: Layers,
  reels: PlayCircle,
  'instructor-images': Users,
  '(root)': Database,
};

const BREAKDOWN_COLORS: Record<string, string> = {
  videos: '#3b82f6',
  hls: '#8b5cf6',
  thumbnails: '#f97316',
  reels: '#ec4899',
  'instructor-images': '#22c55e',
  '(root)': '#64748b',
};

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#0ea5e9', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899',
];

const WARNING_CONFIG: Record<
  string,
  { color: string; gradient: string; bgGradient: string; borderColor: string; Icon: any; label: string }
> = {
  safe:     { color: '#22c55e', gradient: 'from-emerald-500 to-green-400', bgGradient: 'linear-gradient(90deg, #22c55e, #4ade80)', borderColor: 'border-emerald-500/30', Icon: CheckCircle,    label: 'Zonă Gratuită' },
  caution:  { color: '#eab308', gradient: 'from-yellow-500 to-amber-400',  bgGradient: 'linear-gradient(90deg, #eab308, #f59e0b)', borderColor: 'border-yellow-500/30',  Icon: Info,          label: 'Atenție — Peste 50%' },
  warning:  { color: '#f97316', gradient: 'from-orange-500 to-amber-500',  bgGradient: 'linear-gradient(90deg, #f97316, #f59e0b)', borderColor: 'border-orange-500/30',  Icon: AlertTriangle, label: 'Avertisment — Peste 75%' },
  critical: { color: '#ef4444', gradient: 'from-red-500 to-rose-500',      bgGradient: 'linear-gradient(90deg, #ef4444, #f97316)', borderColor: 'border-red-500/30',     Icon: AlertTriangle, label: 'Critic — Peste 90%!' },
};

// ============================================================================
// Component
// ============================================================================

export function B2StorageMonitor({ storage, loading, onRefresh, compact }: B2StorageMonitorProps) {
  const [expanded, setExpanded] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const handleCleanup = async () => {
    try {
      setIsCleaning(true);
      const res = await apiService.admin.cleanupB2DeleteMarkers();
      if (res.success && onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to cleanup B2 delete markers', err);
      alert('Eroare la curățarea markerelor.');
    } finally {
      setIsCleaning(false);
    }
  };

  const freeBytes = storage?.quota?.freeBytes || 10 * 1024 * 1024 * 1024;
  const usedBytes = storage?.usedBytes || 0;
  const remainingFreeBytes = storage?.quota?.remainingFreeBytes ?? Math.max(0, freeBytes - usedBytes);
  const billableBytes = storage?.quota?.billableBytes ?? Math.max(0, usedBytes - freeBytes);
  const hasOverage = billableBytes > 0;

  // Human-friendly GB values
  const usedGb = usedBytes / (1024 * 1024 * 1024);
  const freeGb = freeBytes / (1024 * 1024 * 1024);
  const remainingFreeGb = remainingFreeBytes / (1024 * 1024 * 1024);
  const overageGb = billableBytes / (1024 * 1024 * 1024);

  // Percentage within the free tier (capped at 100 for bar width)
  const usagePercent = freeBytes > 0 ? Math.min(100, (usedBytes / freeBytes) * 100) : 0;
  // Real percentage (can go over 100%)
  const usagePercentReal = freeBytes > 0 ? (usedBytes / freeBytes) * 100 : 0;

  const warningLevel = (storage?.warningLevel || 'safe') as keyof typeof WARNING_CONFIG;
  const config = WARNING_CONFIG[warningLevel] || WARNING_CONFIG.safe;
  const StatusIcon = config.Icon;
  const breakdown = storage?.breakdown || [];
  const tips = storage?.tips || [];
  const historicalOverhead = storage?.historicalOverhead || 0;
  const monthlyCost = storage?.quota?.estimatedMonthlyCost || 0;

  // SVG circular gauge params
  const radius = 58;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const filledLen = (usagePercent / 100) * circumference;

  // ── Empty state ──
  if (!storage && !loading) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-effect rounded-2xl border ${config.borderColor} overflow-hidden`}
    >
      {/* Top accent bar */}
      <div className={`h-1 bg-gradient-to-r ${config.gradient}`} />

      <div className="p-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}>
              <HardDrive className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                B2 Storage Monitor
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full"
                  style={{ backgroundColor: `${config.color}20`, color: config.color }}
                >
                  <StatusIcon className="w-3 h-3" />
                  {config.label}
                </span>
              </h3>
              <p className="text-sm text-gray-400">{storage?.provider || 'Backblaze B2 + Cloudflare CDN'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-right">
              {monthlyCost > 0 ? (
                <span className="text-amber-400 font-medium">
                  <DollarSign className="w-3.5 h-3.5 inline mr-0.5" />
                  Cost lunar estimat: ${monthlyCost.toFixed(2)}
                </span>
              ) : (
                <span className="text-emerald-400 font-medium">
                  <Shield className="w-3.5 h-3.5 inline mr-0.5" />
                  Încă ești în zona gratuită
                </span>
              )}
            </div>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                title="Reîncarcă statisticile B2"
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* ── Overage Alert ── */}
        {hasOverage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/30"
            style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)' }}
          >
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-400">
                Ai depășit spațiul gratuit cu {overageGb.toFixed(2)} GB!
              </p>
              <p className="text-xs text-red-400/70 mt-0.5">
                Se facturează la ${storage?.quota?.pricePerGbMonth?.toFixed(3) || '0.006'}/GB/lună
                → <span className="font-bold text-red-300">${monthlyCost.toFixed(2)}/lună</span>
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-black text-red-400">+{overageGb.toFixed(1)}</div>
              <div className="text-[10px] text-red-400/60 uppercase tracking-wider">GB peste limită</div>
            </div>
          </motion.div>
        )}

        {/* ── Main Layout ── */}
        <div className={`grid grid-cols-1 gap-6 items-center ${compact ? 'md:grid-cols-1' : 'md:grid-cols-[auto_1fr]'}`}>

          {/* Circular Gauge — only in non-compact */}
          {!compact && (
            <div className="flex justify-center">
              <div className="relative w-36 h-36">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
                  <motion.circle
                    cx="70" cy="70" r={radius} fill="none"
                    stroke={config.color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference - filledLen }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{ filter: `drop-shadow(0 0 6px ${config.color}50)` }}
                  />
                  {[50, 75, 90].map(pct => {
                    const angle = (pct / 100) * 360 - 90;
                    const rad = (angle * Math.PI) / 180;
                    const x = 70 + (radius + 4) * Math.cos(rad);
                    const y = 70 + (radius + 4) * Math.sin(rad);
                    return <circle key={pct} cx={x} cy={y} r="2" fill="rgba(255,255,255,0.2)" />;
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span
                    className="text-3xl font-black"
                    style={{ color: config.color }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {Math.round(usagePercentReal)}%
                  </motion.span>
                  <span className="text-xs text-gray-500 mt-0.5">
                    {hasOverage ? 'depășit!' : 'utilizat'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Stats Area */}
          <div className="space-y-4" style={{ isolation: 'isolate' }}>

            {/* ═══════════════════════════════════════════
                MAIN PROGRESS BAR
                ═══════════════════════════════════════════ */}
            <div>
              {/* Labels above bar */}
              <div className="flex items-end justify-between mb-3">
                <div>
                  <span className="text-2xl font-black" style={{ color: config.color }}>
                    {usedGb.toFixed(2)} GB
                  </span>
                  <span className="text-sm text-gray-400 ml-2">
                    / {freeGb.toFixed(0)} GB gratuit
                  </span>
                </div>
                <div className="text-right">
                  {hasOverage ? (
                    <span className="text-sm font-bold" style={{ color: '#ef4444' }}>
                      +{overageGb.toFixed(2)} GB depășire
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">
                      Rămas: <span className="font-bold" style={{ color: '#34d399' }}>{remainingFreeGb.toFixed(2)} GB</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Bar container */}
              <div
                style={{
                  height: '32px',
                  borderRadius: '16px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  overflow: 'hidden',
                  position: 'relative',
                  isolation: 'isolate',
                }}
              >
                {/* Filled portion */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePercent}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    borderRadius: '16px',
                    background: hasOverage
                      ? 'linear-gradient(90deg, #ef4444 0%, #f97316 100%)'
                      : usagePercent >= 75
                        ? 'linear-gradient(90deg, #f97316 0%, #eab308 100%)'
                        : usagePercent >= 50
                          ? 'linear-gradient(90deg, #eab308 0%, #22c55e 100%)'
                          : 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                    boxShadow: `0 0 24px ${config.color}66`,
                    position: 'relative',
                    zIndex: 2,
                    minWidth: usagePercent > 0 ? '8px' : '0px',
                  }}
                >
                  {/* Shine overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '16px',
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 40%, transparent 60%)',
                      pointerEvents: 'none',
                    }}
                  />
                  {/* Text inside bar */}
                  {usagePercent > 18 && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 800,
                        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {usedGb.toFixed(1)} GB folosit
                    </div>
                  )}
                </motion.div>

                {/* Tick marks */}
                {[25, 50, 75].map(pct => (
                  <div
                    key={pct}
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: `${pct}%`,
                      width: '1px',
                      backgroundColor: 'rgba(148,163,184,0.15)',
                      zIndex: 1,
                    }}
                  />
                ))}
              </div>

              {/* Scale labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', padding: '0 2px' }}>
                <span style={{ fontSize: '10px', color: '#64748b' }}>0 GB</span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>{(freeGb / 4).toFixed(0)} GB</span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>{(freeGb / 2).toFixed(0)} GB</span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>{(freeGb * 3 / 4).toFixed(0)} GB</span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>{freeGb.toFixed(0)} GB</span>
              </div>
            </div>

            {/* ═══════════════════════════════════════════
                SECONDARY OVERAGE BAR (only when over limit)
                ═══════════════════════════════════════════ */}
            {hasOverage && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ fontSize: '12px', color: '#f87171', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle className="w-3 h-3" />
                    Depășire peste {freeGb.toFixed(0)} GB gratuit
                  </span>
                  <span style={{ fontSize: '12px', color: '#fca5a5', fontWeight: 700 }}>
                    +{overageGb.toFixed(2)} GB → ${monthlyCost.toFixed(2)}/lună
                  </span>
                </div>
                <div
                  style={{
                    height: '20px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    overflow: 'hidden',
                    position: 'relative',
                    isolation: 'isolate',
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (billableBytes / freeBytes) * 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                    style={{
                      height: '100%',
                      borderRadius: '10px',
                      background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                      boxShadow: '0 0 20px rgba(239,68,68,0.4)',
                      position: 'relative',
                      minWidth: '8px',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '10px',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
                      }}
                    />
                    {overageGb > 0.3 && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: 800,
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                        }}
                      >
                        +{overageGb.toFixed(1)} GB
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
            )}

            {/* Metric cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl bg-white/5 p-3 border border-white/5 hover:border-emerald-500/20 transition-colors">
                <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                  <Server className="w-3 h-3" />
                  Rămas gratuit
                </div>
                <div className="text-lg font-bold text-emerald-400">{formatBytes(remainingFreeBytes)}</div>
                <div className="text-[10px] text-gray-600 mt-0.5">{remainingFreeGb.toFixed(2)} GB din {freeGb.toFixed(0)} GB</div>
              </div>
              <div className="rounded-xl bg-white/5 p-3 border border-white/5 hover:border-blue-500/20 transition-colors">
                <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                  <HardDrive className="w-3 h-3" />
                  Spațiu folosit
                </div>
                <div className="text-lg font-bold">{usedGb.toFixed(2)} GB</div>
                <div className="text-[10px] text-gray-600 mt-0.5">{storage?.currentObjects?.count || 0} obiecte</div>
              </div>
              <div className={`rounded-xl bg-white/5 p-3 border transition-colors ${hasOverage ? 'border-red-500/20' : 'border-white/5 hover:border-amber-500/20'}`}>
                <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                  <DollarSign className="w-3 h-3" />
                  {hasOverage ? 'Depășire' : 'Facturat'}
                </div>
                <div className="text-lg font-bold" style={{ color: hasOverage ? '#ef4444' : monthlyCost > 0 ? '#f97316' : undefined }}>
                  {hasOverage ? `+${overageGb.toFixed(2)} GB` : formatBytes(storage?.quota?.billableBytes)}
                </div>
                <div className="text-[10px] text-gray-600 mt-0.5">
                  {hasOverage ? `$${monthlyCost.toFixed(2)}/lună` : `$${storage?.quota?.pricePerGbMonth?.toFixed(3) || '0.006'}/GB/lună`}
                </div>
              </div>
              <div className="rounded-xl bg-white/5 p-3 border border-white/5 hover:border-purple-500/20 transition-colors">
                <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                  <Trash2 className="w-3 h-3" />
                  Versiuni vechi
                </div>
                <div className="text-lg font-bold" style={{ color: historicalOverhead > 1024 * 1024 ? '#a78bfa' : undefined }}>
                  {formatBytes(historicalOverhead)}
                </div>
                <div className="text-[10px] text-gray-600 mt-0.5">{storage?.versions?.deleteMarkers || 0} delete markers</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Content Breakdown ── */}
        {!compact && breakdown.length > 0 && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-3"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Defalcare pe tip de conținut ({breakdown.length} categorii)
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2">
                    {breakdown.map((item, idx) => {
                      const PrefixIcon = BREAKDOWN_ICONS[item.prefix] || Database;
                      const barColor = BREAKDOWN_COLORS[item.prefix] || COLORS[idx % COLORS.length];
                      const pct = usedBytes > 0 ? (item.bytes / usedBytes) * 100 : 0;
                      return (
                        <motion.div
                          key={item.prefix}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center gap-3"
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${barColor}20` }}>
                            <PrefixIcon className="w-3.5 h-3.5" style={{ color: barColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-300 font-medium capitalize">{item.prefix === '(root)' ? 'Alte fișiere' : item.prefix}</span>
                              <span className="text-gray-500">{formatBytes(item.bytes)} · {item.count} fișiere · {pct.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.5, delay: idx * 0.05 }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: barColor }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Tips ── */}
        {tips.length > 0 && (
          <div className="space-y-2">
            {tips.map((tip, i) => {
              const isDeleteMarkerTip = tip.toLowerCase().includes('delete marker');
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center justify-between gap-2 text-xs rounded-lg px-3 py-2"
                  style={{ backgroundColor: `${config.color}10`, color: config.color }}
                >
                  <div className="flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>{tip}</span>
                  </div>
                  {isDeleteMarkerTip && (
                    <button
                      onClick={handleCleanup}
                      disabled={isCleaning}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-md transition-colors font-medium ml-2 disabled:opacity-50 flex items-center gap-1 flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                      {isCleaning ? 'Se curăță...' : 'Curăță markerele'}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default B2StorageMonitor;