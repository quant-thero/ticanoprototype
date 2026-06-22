import React, { useState, useEffect } from 'react';
import { Send, CheckCheck, Phone, MoreVertical, Search, Smile, Paperclip, MessageCircle } from 'lucide-react';
import { getWaTemplates } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const formatTime = () => new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

export default function WhatsAppSimulator({ clientName = 'Stacey Nthoi', clientPhone = '+267 71 234 567' }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [variables, setVariables]     = useState({});
  const [messages, setMessages]       = useState([
    { id:1, from:'client', text:'Hello, I wanted to follow up on my complaint. Any updates?', time:'09:14', read:true },
    { id:2, from:'pm',     text:'Hi Stacey! Thank you for reaching out. We are actively working on your complaint TCN-0002 and will have an update by end of day.', time:'09:18', read:true },
  ]);
  const [preview, setPreview]   = useState('');
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState([]);

  const { user } = useAuth();
  useEffect(() => {
    getWaTemplates(user?.role).then(({ data }) => setTemplates(data));
  }, [user?.role]);

  const buildPreview = (tpl, vars) => {
    if (!tpl) return '';
    let text = tpl.body;
    (tpl.variables || []).forEach(v => {
      text = text.replace(`[${v}]`, vars[v] || `[${v}]`);
    });
    return text;
  };

  useEffect(() => {
    setPreview(buildPreview(selectedTpl, variables));
  }, [selectedTpl, variables]);

  const handleSelectTpl = (tpl) => {
    setSelectedTpl(tpl);
    const initVars = {};
    (tpl.variables || []).forEach(v => { initVars[v] = v === 'Name' ? clientName : ''; });
    setVariables(initVars);
  };

  const handleSend = async () => {
    if (!preview.trim()) return toast.error('Select a template and fill variables');
    setSending(true);
    await new Promise(r => setTimeout(r, 800));
    const newMsg = { id: Date.now(), from:'pm', text: preview, time: formatTime(), read: false };
    setMessages(prev => [...prev, newMsg]);
    setSent(prev => [...prev, { ...newMsg, template: selectedTpl?.name, sentAt: new Date().toISOString() }]);
    toast.success(`WhatsApp message sent to ${clientName} ✓`);
    setSelectedTpl(null); setVariables({}); setPreview('');
    setSending(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Template composer */}
      <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
        <h4 className="font-semibold text-ticano-charcoal dark:text-white mb-4 flex items-center gap-2">
          <MessageCircle size={16} className="text-green-500"/> Compose Message
        </h4>

        {/* Template selector */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Select Template</label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {templates.map(t => (
              <button key={t.id} onClick={() => handleSelectTpl(t)}
                className={`w-full text-left p-3 rounded-xl border transition-all duration-150 ${selectedTpl?.id===t.id ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500'}`}>
                <p className="font-medium text-sm text-gray-800 dark:text-white">{t.name}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{t.body}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Variable filling */}
        {selectedTpl && selectedTpl.variables?.length > 0 && (
          <div className="mb-4 space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">Fill Variables</label>
            {selectedTpl.variables.map(v => (
              <div key={v}>
                <label className="text-xs text-gray-500 mb-0.5 block">[{v}]</label>
                <input value={variables[v]||''} onChange={e=>setVariables({...variables,[v]:e.target.value})}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  placeholder={`Enter ${v}…`} />
              </div>
            ))}
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <p className="text-xs font-semibold text-green-600 mb-1">Preview</p>
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{preview}</p>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
          <span>To: {clientName} · {clientPhone}</span>
        </div>
        <button onClick={handleSend} disabled={sending || !preview}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50">
          {sending ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Sending…</> : <><Send size={14}/>Send WhatsApp Message</>}
        </button>

        {/* Send log */}
        {sent.length > 0 && (
          <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Sent Log</p>
            <div className="space-y-2">
              {sent.map(s => (
                <div key={s.id} className="flex items-center gap-2 text-xs">
                  <CheckCheck size={12} className="text-green-500 shrink-0"/>
                  <span className="text-gray-600 dark:text-gray-300 flex-1 truncate">{s.template} → {clientName}</span>
                  <span className="text-gray-400">{s.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp phone mockup */}
      <div className="flex justify-center">
        <div className="w-72 bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
          <div className="bg-white rounded-[2rem] overflow-hidden" style={{ height:'560px' }}>
            {/* WA Header */}
            <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-300 rounded-full flex items-center justify-center text-green-900 font-bold text-sm">{clientName.charAt(0)}</div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm leading-tight">{clientName}</p>
                <p className="text-green-200 text-[10px]">online</p>
              </div>
              <div className="flex gap-3 text-white">
                <Phone size={15}/><MoreVertical size={15}/>
              </div>
            </div>
            {/* Chat bg */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ background:'#ECE5DD', height:'calc(100% - 110px)' }}>
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.from==='pm'?'justify-end':'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs shadow-sm ${m.from==='pm' ? 'bg-[#DCF8C6] rounded-tr-sm' : 'bg-white rounded-tl-sm'}`}>
                    <p className="text-gray-800 leading-relaxed">{m.text}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[9px] text-gray-400">{m.time}</span>
                      {m.from==='pm' && <CheckCheck size={11} className={m.read?'text-[#53bdeb]':'text-gray-400'}/>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* WA input bar */}
            <div className="bg-[#F0F0F0] px-2 py-1.5 flex items-center gap-2">
              <Smile size={20} className="text-gray-500"/>
              <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-xs text-gray-400">Type a message</div>
              <Paperclip size={18} className="text-gray-500"/>
              <div className="w-8 h-8 bg-[#075E54] rounded-full flex items-center justify-center">
                <Send size={13} className="text-white"/>
              </div>
            </div>
          </div>
          {/* Home bar */}
          <div className="flex justify-center mt-2"><div className="w-24 h-1 bg-gray-600 rounded-full"/></div>
        </div>
      </div>
    </div>
  );
}
