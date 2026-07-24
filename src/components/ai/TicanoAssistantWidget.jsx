import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MessageCircle, X, Send, Sparkles, RotateCcw, Minus, Maximize2, GripHorizontal } from 'lucide-react';
import { useAIAssistant } from '../../context/AIAssistantContext';
import { useAuth } from '../../context/AuthContext';
import FormattedMessage from './FormattedMessage';

const QUICK_ACTIONS = {
  none: ['Our services', 'Business hours', 'How do I register?'-'Contact us'],
  customer: ['My complaints', 'Complaint status', 'My profile', 'Contact support'],
  portfolio_manager: ["Today's complaints", 'Pending cases', 'Search complaints', 'Knowledge base'],
  service_manager: ["Today's complaints", 'Pending cases', 'Staff performance', 'Weekly summary'],
  director: ['Dashboard summary', 'Complaint analytics', 'Branch performance', 'Monthly report'],
  admin: ['Complaint analytics', 'Branch performance', 'Knowledge base', 'Pending cases'],
  marketing: ['Our services', 'Company info', 'Branches', 'Contact us'],
};

const PANEL_W = 384; // approx max-w-sm in px, used for clamping while dragging
const PANEL_H = 600;
const STORAGE_KEY = 'ticano_assistant_position';

// Clamp a stored/dragged position so the widget can never end up
// somewhere off-screen (e.g. after a window resize).
function clampPos(pos, width, height) {
  const maxX = Math.max(8, window.innerWidth - width - 8);
  const maxY = Math.max(8, window.innerHeight - height - 8);
  return { x: Math.min(Math.max(8, pos.x), maxX), y: Math.min(Math.max(8, pos.y), maxY) };
}

export default function TicanoAssistantWidget() {
  const { isOpen, open, close, toggle, messages, isTyping, sendMessage, reset, welcomeText, role } = useAIAssistant();
  const { user, token } = useAuth();
  const isAuthed = Boolean(token && user);
  const [input, setInput] = useState('');
  const [minimized, setMinimized] = useState(false);
  const scrollRef = useRef(null);

  // Position is stored as distance from the bottom-right corner (matches
  // the original fixed bottom-5 right-5 placement), so it stays anchored
  // sensibly even if the window is resized.
  const [pos, setPos] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved) return saved;
    } catch { /* ignore corrupt storage */ }
    return { right: 20, bottom: 20 };
  });
  const dragState = useRef(null);

  const startDrag = useCallback((e) => {
    const point = e.touches ? e.touches[0] : e;
    dragState.current = {
      startX: point.clientX, startY: point.clientY,
      startRight: pos.right, startBottom: pos.bottom,
      moved: false,
    };
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('touchmove', onDrag, { passive: false });
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);
  }, [pos]);

  const onDrag = useCallback((e) => {
    if (!dragState.current) return;
    if (e.touches) e.preventDefault();
    const point = e.touches ? e.touches[0] : e;
    const dx = point.clientX - dragState.current.startX;
    const dy = point.clientY - dragState.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragState.current.moved = true;
    const width = isOpen && !minimized ? PANEL_W : 60;
    const height = isOpen && !minimized ? PANEL_H : 60;
    const next = clampPos({
      x: window.innerWidth - (dragState.current.startRight + width) - dx,
      y: window.innerHeight - (dragState.current.startBottom + height) - dy,
    }, width, height);
    setPos({ right: window.innerWidth - next.x - width, bottom: window.innerHeight - next.y - height });
  }, [isOpen, minimized]);

  const endDrag = useCallback(() => {
    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('touchmove', onDrag);
    window.removeEventListener('mouseup', endDrag);
    window.removeEventListener('touchend', endDrag);
    setPos((p) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {} return p; });
    // Small delay so the click handler on the same element can check
    // dragState.current.moved before it's cleared.
    setTimeout(() => { dragState.current = null; }, 0);
  }, [onDrag]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping, isOpen]);

  // Re-clamp on window resize so it can't get stranded off-screen.
  useEffect(() => {
    const onResize = () => {
      const width = isOpen && !minimized ? PANEL_W : 60;
      const height = isOpen && !minimized ? PANEL_H : 60;
      setPos((p) => {
        const x = window.innerWidth - p.right - width;
        const y = window.innerHeight - p.bottom - height;
        const clamped = clampPos({ x, y }, width, height);
        return { right: window.innerWidth - clamped.x - width, bottom: window.innerHeight - clamped.y - height };
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isOpen, minimized]);

  const handleSend = (text) => {
    const value = (text ?? input).trim();
    if (!value) return;
    sendMessage(value);
    setInput('');
  };

  const handleLauncherClick = () => {
    if (dragState.current?.moved) return; // was a drag, not a click, don't also open
    open();
  };

  const quickActions = QUICK_ACTIONS[role || 'none'] || QUICK_ACTIONS.none;
  const style = { right: pos.right, bottom: pos.bottom };

  return (
    <>
      {/* Floating launcher button, closed state */}
      {!isOpen && (
        <button
          onMouseDown={startDrag}
          onTouchStart={startDrag}
          onClick={handleLauncherClick}
          aria-label="Open Ticano Assistant"
          style={style}
          className="fixed z-[70] flex items-center gap-2 rounded-full bg-ticano-red text-white shadow-lg shadow-ticano-red/30 px-4 py-3.5 hover:bg-ticano-red-dark transition-colors duration-300 cursor-grab active:cursor-grabbing select-none"
        >
          <MessageCircle size={22} />
          <span className="hidden sm:inline text-sm font-semibold pr-1">Ask Ticano</span>
        </button>
      )}

      {/* Minimized state, small draggable pill, conversation preserved underneath */}
      {isOpen && minimized && (
        <button
          onMouseDown={startDrag}
          onTouchStart={startDrag}
          onClick={() => { if (!dragState.current?.moved) setMinimized(false); }}
          style={style}
          className="fixed z-[70] flex items-center gap-2 rounded-full bg-ticano-charcoal text-white shadow-lg px-4 py-3 hover:bg-ticano-charcoal/90 transition-colors cursor-grab active:cursor-grabbing select-none"
          title="Restore Ticano Assistant"
        >
          <Sparkles size={16} className="text-ticano-red" />
          <span className="text-sm font-medium">Ticano Assistant</span>
          <Maximize2 size={14} className="text-white/60" />
        </button>
      )}

      {isOpen && !minimized && (
        <div
          style={style}
          className="fixed z-[70] w-[92vw] max-w-sm h-[70vh] max-h-[600px] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-black/5 bg-white dark:bg-ticano-dark-card animate-[scale-in_0.2s_ease-out]"
        >
          {/* Header, drag handle */}
          <div
            onMouseDown={startDrag}
            onTouchStart={startDrag}
            className="flex items-center justify-between px-4 py-3 bg-ticano-charcoal text-white shrink-0 cursor-grab active:cursor-grabbing select-none"
          >
            <div className="flex items-center gap-2 min-w-0">
              <GripHorizontal size={14} className="text-white/30 shrink-0" />
              <div className="w-8 h-8 rounded-full bg-ticano-red flex items-center justify-center shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">Ticano Assistant</p>
                <p className="text-[11px] text-white/60 leading-tight truncate">
                  {isAuthed ? `Signed in \u2014 ${user.name}` : 'Ask me anything'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={reset} title="Start new conversation" className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <RotateCcw size={16} />
              </button>
              <button onClick={() => setMinimized(true)} title="Minimize" className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <Minus size={16} />
              </button>
              <button onClick={close} title="Close" className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 bg-ticano-bg dark:bg-ticano-dark-bg">
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white dark:bg-ticano-dark-card text-ticano-charcoal dark:text-gray-100 px-3.5 py-2.5 text-sm shadow-sm">
                <FormattedMessage text={welcomeText} />
              </div>
            </div>

            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-ticano-red text-white rounded-br-sm'
                      : 'bg-white dark:bg-ticano-dark-card text-ticano-charcoal dark:text-gray-100 rounded-bl-sm'
                  }`}
                >
                  {m.role === 'user' ? m.content : <FormattedMessage text={m.content} />}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-ticano-dark-card rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex gap-1 items-center">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-ticano-gray animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick actions */}
          {messages.length === 0 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
              {quickActions.map((qa) => (
                <button
                  key={qa}
                  onClick={() => handleSend(qa)}
                  className="text-[11px] font-medium px-2.5 py-1.5 rounded-full border border-ticano-red/25 text-ticano-red hover:bg-ticano-red-light transition-colors"
                >
                  {qa}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2 p-2.5 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-ticano-dark-card shrink-0"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message\u2026"
              className="flex-1 text-sm px-3 py-2 rounded-full bg-ticano-bg dark:bg-ticano-dark-bg border border-transparent focus:border-ticano-red/40 outline-none text-ticano-charcoal dark:text-gray-100"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="w-9 h-9 shrink-0 rounded-full bg-ticano-red text-white flex items-center justify-center disabled:opacity-40 hover:bg-ticano-red-dark transition-colors"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
