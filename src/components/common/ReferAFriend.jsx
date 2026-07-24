import React, { useState } from 'react';
import { Gift, Copy, Check, MessageCircle, Facebook, Share2, Link2 } from 'lucide-react';
import { Modal } from './UI';
import toast from 'react-hot-toast';

/**
 * Refer-a-Friend widget, Client Dashboard only.
 *
 * Clicking the button opens a mini portal that generates a personal
 * referral link (the client's name carried as a `?ref=` query param on
 * the public registration page). Friends who open that link land on
 * /register with "Friend or Family Referral" and the referrer's name
 * already filled in, see the matching logic added to RegisterPage.jsx.
 *
 * No new tables or columns: this reuses the existing referredByName /
 * referral_source flow that registration already writes to client_profiles.
 */
export default function ReferAFriend({ clientName }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const referralLink = `${window.location.origin}/register?ref=${encodeURIComponent(clientName || '')}`;
  const shareMessage = `I've been using Ticano Group for business funding and support, thought you'd find it useful too. Sign up here:`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Link copied, paste it anywhere');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy automatically, select and copy the link manually');
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shareMessage} ${referralLink}`)}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`;

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Ticano Group', text: shareMessage, url: referralLink });
      } catch {
        // user cancelled the share sheet, nothing to do
      }
    } else {
      copyLink();
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-ticano-dark-card rounded-2xl shadow p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center shrink-0">
          <Gift size={22} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-ticano-charcoal dark:text-white">Refer a Friend</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Know a business that could use Ticano? Share your link.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 px-4 py-2 bg-ticano-red text-white rounded-xl text-sm font-semibold hover:bg-ticano-red-dark transition-colors"
        >
          Get my link
        </button>
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Refer a Friend" size="sm">
        <div className="space-y-5">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Share your personal link with friends on WhatsApp, Facebook, or anywhere else. When they open it,
            it takes them straight to the sign-up page with your name already filled in as their referrer.
          </p>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Your referral link</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 truncate">
                <Link2 size={14} className="text-gray-400 shrink-0" />
                <span className="truncate">{referralLink}</span>
              </div>
              <button
                onClick={copyLink}
                title="Copy link"
                className={`shrink-0 p-2.5 rounded-xl transition-colors ${copied ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-ticano-charcoal text-white hover:bg-ticano-charcoal/90'}`}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Share directly</p>
            <div className="grid grid-cols-3 gap-2">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <MessageCircle size={20} className="text-green-500" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">WhatsApp</span>
              </a>
              <a href={facebookHref} target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <Facebook size={20} className="text-blue-600" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Facebook</span>
              </a>
              <button onClick={nativeShare}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <Share2 size={20} className="text-gray-500" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">More</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
