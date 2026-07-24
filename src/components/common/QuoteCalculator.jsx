import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator, MessageCircle, ArrowRight, Sparkles, TrendingUp, Info,
  Wallet, ReceiptText, CheckCircle2, Copy, RotateCcw, ShieldCheck, PiggyBank,
} from 'lucide-react';
import { formatPula } from '../../utils/format';
import { getCalculatorRanges } from '../../services/supabaseApi';
import toast from 'react-hot-toast';

/**
 * QuoteCalculator, Ticano's "Quote Calculator"
 * ------------------------------------------------------------------
 * Client enters two figures: the PO amount (what needs funding) and the
 * amount they're charging the tender issuer (what they'll be paid once
 * the order is fulfilled). Interest is looked up from admin-configured
 * ranges (fixed fee or percentage, by PO amount bracket, see Admin's
 * Calculator Manager) and applied to the PO amount, giving:
 * Total Repayment = PO amount + interest
 * Interest Only = the fee itself
 * Remaining Profit = tender issuer amount − total repayment
 *
 * Used in two contexts:
 * 1. The public homepage, behind a friendly "Let's talk about your
 * project" gate, ending with a nudge to create a free account.
 * 2. Internal dashboards (Client, PM, Director, Service Manager), * embedded directly inside a card, no gate, with a context-aware
 * closing action (e.g. copy summary for staff).
 *
 * Props
 * - showIntro: show the "Let's talk about your project" gate first
 * - embedded: render without outer modal chrome (for dashboard cards)
 * - ctaVariant: 'visitor' | 'staff' | 'client', controls the closing CTA
 * - onClose: optional close handler (renders an X when provided)
 */
export default function QuoteCalculator({
  showIntro = true,
  embedded = false,
  ctaVariant = 'visitor',
  onClose = null,
}) {
  const [step, setStep] = useState(showIntro ? 'intro' : 'form');
  const [poAmount, setPoAmount] = useState('');
  const [issuerAmount, setIssuerAmount] = useState('');
  const [ranges, setRanges] = useState([]);
  const [rangesLoaded, setRangesLoaded] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    getCalculatorRanges()
      .then(({ data }) => setRanges(data))
      .catch((err) => console.error('[QuoteCalculator] could not load rate ranges:', err))
      .finally(() => setRangesLoaded(true));
  }, []);

  const numericPo = parseFloat(poAmount);
  const numericIssuer = parseFloat(issuerAmount);
  const isValidPo = !Number.isNaN(numericPo) && numericPo > 0;
  const isValidIssuer = !Number.isNaN(numericIssuer) && numericIssuer > 0;
  const isValid = isValidPo && isValidIssuer;

  // Finds the configured bracket this PO amount falls into, the ranges
  // are sorted ascending by minAmount, so the last one whose min is at or
  // below the PO amount (and whose max, if any, is above it) applies.
  const findRange = (amount) => ranges.find((r) => amount >= r.minAmount && (r.maxAmount === null || amount < r.maxAmount));

  const handleCalculate = () => {
    setTouched(true);
    if (!isValid) return;
    const range = findRange(numericPo);
    if (!range) {
      toast.error('No rate is configured for this amount yet, please contact your Portfolio Manager.');
      return;
    }
    const interest = range.calcType === 'fixed' ? range.value : numericPo * (range.value / 100);
    const totalRepayment = numericPo + interest;
    const remainingProfit = numericIssuer - totalRepayment;
    setResult({ poAmount: numericPo, issuerAmount: numericIssuer, interest, totalRepayment, remainingProfit, range });
  };

  const handleReset = () => {
    setResult(null);
    setTouched(false);
  };

  const handleCopy = async () => {
    if (!result) return;
    const summary =
      `Ticano Quote Estimate\n` +
      `Loan Amount: ${formatPula(result.poAmount)}\n` +
      `PO Amount/Contract Amount: ${formatPula(result.issuerAmount)}\n` +
      `Interest Only: ${formatPula(result.interest)}\n` +
      `Total Repayment: ${formatPula(result.totalRepayment)}\n` +
      `Remaining Profit: ${formatPula(result.remainingProfit)}\n` +
      `(Indicative estimate only, final terms confirmed after document review.)`;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast.success('Quote summary copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy, please select and copy manually');
    }
  };

  // ---------------------------------------------------------------
  // INTRO GATE
  // ---------------------------------------------------------------
  if (step === 'intro') {
    return (
      <div className={embedded ? '' : 'p-7 sm:p-9 text-center'}>
        {!embedded && onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ✕
          </button>
        )}
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-ticano-red/10 flex items-center justify-center">
          <MessageCircle size={28} className="text-ticano-red" />
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-ticano-charcoal dark:text-white mb-3">
          Let&rsquo;s talk about your project
        </h3>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed mb-7">
          Tell us your PO amount and what you're charging the tender issuer, and our Quote
          Calculator will show your total repayment, interest, and remaining profit, instantly.
        </p>
        <button
          onClick={() => setStep('form')}
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-ticano-red text-white rounded-xl font-bold hover:bg-ticano-red-dark transition-all shadow-lg shadow-ticano-red/30 hover:shadow-ticano-red/50"
        >
          Open Quote Calculator <ArrowRight size={16} />
        </button>
        <p className="text-[11px] text-gray-400 mt-4">Takes less than a minute · No account needed to try it</p>
      </div>
    );
  }

  // ---------------------------------------------------------------
  // CALCULATOR + RESULTS
  // ---------------------------------------------------------------
  return (
    <div className={embedded ? '' : 'p-6 sm:p-8'}>
      {!embedded && (
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-ticano-red/10 flex items-center justify-center shrink-0">
            <Calculator size={20} className="text-ticano-red" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-ticano-charcoal dark:text-white leading-tight">Quote Calculator</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Instant estimate for purchase order &amp; contract funding</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        )}
      </div>
      )}

      {!result && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Loan Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">P</span>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                value={poAmount}
                onChange={(e) => setPoAmount(e.target.value)}
                placeholder="e.g. 20,000"
                className={`w-full pl-8 pr-4 py-3.5 rounded-xl border text-lg font-bold bg-white dark:bg-gray-800 text-ticano-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red/50 transition-colors
                  ${touched && !isValidPo ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
              />
            </div>
            {touched && !isValidPo && (
              <p className="text-xs text-red-500 mt-1.5">Please enter an amount greater than zero.</p>
            )}
            <p className="text-xs text-gray-400 mt-1.5">The value of your supplier&rsquo;s quotation or the order you need funded.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              PO Amount/Contract Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">P</span>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                value={issuerAmount}
                onChange={(e) => setIssuerAmount(e.target.value)}
                placeholder="e.g. 28,000"
                className={`w-full pl-8 pr-4 py-3.5 rounded-xl border text-lg font-bold bg-white dark:bg-gray-800 text-ticano-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red/50 transition-colors
                  ${touched && !isValidIssuer ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
              />
            </div>
            {touched && !isValidIssuer && (
              <p className="text-xs text-red-500 mt-1.5">Please enter an amount greater than zero.</p>
            )}
            <p className="text-xs text-gray-400 mt-1.5">What you&rsquo;ll invoice the tender issuer once the order is fulfilled.</p>
          </div>

          {rangesLoaded && ranges.length === 0 ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
              <Info size={13} className="shrink-0 mt-0.5" />
              Rates haven&rsquo;t been configured yet, contact your Portfolio Manager for a manual quote.
            </p>
          ) : (
            <p className="text-xs text-gray-400 flex items-start gap-1.5">
              <Info size={13} className="shrink-0 mt-0.5" />
              Interest is calculated from Ticano&rsquo;s current rate bands based on your PO amount, your
              Portfolio Manager will confirm your exact rate.
            </p>
          )}

          <button
            onClick={handleCalculate}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-ticano-red text-white rounded-xl font-bold hover:bg-ticano-red-dark transition-all shadow-lg shadow-ticano-red/30 hover:shadow-ticano-red/50"
          >
            Calculate My Quote <TrendingUp size={16} />
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-5 animate-fade-up">
          <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-5 sm:p-6">
            <div className="flex items-center justify-between py-2.5">
              <span className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><Wallet size={15} /> Loan Amount</span>
              <span className="font-bold text-ticano-charcoal dark:text-white">{formatPula(result.poAmount)}</span>
            </div>
            <div className="flex items-center justify-between py-2.5 border-t border-gray-200 dark:border-gray-700">
              <span className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><ReceiptText size={15} /> Interest Only {result.range.calcType === 'percentage' ? `(${result.range.value}%)` : '(fixed fee)'}</span>
              <span className="font-bold text-ticano-charcoal dark:text-white">{formatPula(result.interest)}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-t-2 border-dashed border-gray-300 dark:border-gray-600">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Total Repayment</span>
              <span className="text-xl font-bold text-ticano-red">{formatPula(result.totalRepayment)}</span>
            </div>
            <div className="flex items-center justify-between py-3 mt-1 border-t border-gray-200 dark:border-gray-700">
              <span className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200"><PiggyBank size={16} className="text-green-600" /> Remaining Profit</span>
              <span className={`text-xl font-bold ${result.remainingProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatPula(result.remainingProfit)}</span>
            </div>
          </div>
          {result.remainingProfit < 0 && (
            <p className="text-xs text-red-500 flex items-start gap-1.5 bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
              <Info size={13} className="shrink-0 mt-0.5" />
              The amount charged to the tender issuer doesn't cover the total repayment at this PO amount, talk to your Portfolio Manager about the numbers before proceeding.
            </p>
          )}
          <p className="text-[11px] text-gray-400 flex items-start gap-1.5">
            <Info size={12} className="shrink-0 mt-0.5" />
            This is an indicative estimate only and does not constitute a formal offer of funding.
            Final terms are confirmed once your documents have been reviewed.
          </p>

          {/* Contextual closing action */}
          {ctaVariant === 'visitor' && (
            <div className="rounded-2xl bg-ticano-charcoal p-6 text-center relative overflow-hidden">
              <Sparkles size={80} className="absolute -top-4 -right-4 text-white/5" />
              <p className="text-white font-bold mb-1.5 relative">Like what you see?</p>
              <p className="text-white/60 text-sm mb-5 relative leading-relaxed">
                Create your free Ticano account to save this quote and start your funding
                application, no fees to sign up, no obligation.
              </p>
              <Link
                to="/register"
                className="relative inline-flex items-center gap-2 px-6 py-3 bg-ticano-red text-white rounded-xl font-bold hover:bg-ticano-red-dark transition-all shadow-lg shadow-ticano-red/30"
              >
                Create My Free Account <ArrowRight size={15} />
              </Link>
            </div>
          )}

          {ctaVariant === 'staff' && (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Share this estimate</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Copy this quote to share with a client during a call or on WhatsApp.</p>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-ticano-charcoal dark:bg-gray-700 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                {copied ? <><CheckCircle2 size={15} /> Copied</> : <><Copy size={15} /> Copy Quote Summary</>}
              </button>
            </div>
          )}

          {ctaVariant === 'client' && (
            <div className="rounded-2xl bg-ticano-red/5 border border-ticano-red/15 p-5 flex items-start gap-3">
              <ShieldCheck size={20} className="text-ticano-red shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-ticano-charcoal dark:text-white">Ready to move forward?</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Share this estimate with your assigned Portfolio Manager to submit it for
                  approval and get your application moving.
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-ticano-red transition-colors"
          >
            <RotateCcw size={14} /> Calculate another amount
          </button>
        </div>
      )}
    </div>
  );
}
