import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { converse, extractAndLog } from '../services/aiService';

const AIAssistantContext = createContext(null);

const WELCOME_BY_ROLE = {
  none: 'Dumela! Ke nna Ticano Assistant \u2014 o ka mpotsa ka ditirelo tsa rona, mafelo a rona kgotsa gore o ka simolola jang.\n(Hi! I\u2019m the Ticano Assistant. Ask me about our services, branches or how to get started.)',
  customer: 'Dumela! Nka go thusa ka complaint status ya gago, profile ya gago kgotsa dipotso tsotlhe ka Ticano.\n(Hi! I can help with your complaint status, your profile or any general questions.)',
  portfolio_manager: 'Hi \u2014 ask me about complaints, your portfolio, or the knowledge base.',
  service_manager: 'Hi \u2014 ask me about branch complaints, staff performance, or the knowledge base.',
  director: 'Hi \u2014 ask me for a complaint analytics summary, branch performance, or a management report.',
  admin: 'Hi \u2014 ask me for complaints, branch performance, or knowledge base content.',
  marketing: "Hi! I can help with general company information.",
};

export const AIAssistantProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([]); // UI-facing: {role, content, id}
  const conversationIdRef = useRef(null);
  const nextId = useRef(1);
  const identityRef = useRef(undefined); // undefined = not initialised yet

  // Only ever treat the assistant as "signed in" when there's BOTH a valid
  // token AND a user object, a lingering `user` in localStorage/state
  // without a token (e.g. after a partial/failed logout) must not leak an
  // identity to the assistant. This mirrors what ProtectedRoute checks.
  const isAuthed = Boolean(token && user);
  const ctx = isAuthed
    ? { role: user.role, userId: user.id, userName: user.name, branch: user.branch }
    : { role: null, userId: null, userName: null, branch: null };

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const reset = useCallback(() => {
    setMessages([]);
    conversationIdRef.current = null;
  }, []);

  // Whenever the *identity* the assistant is speaking to changes, logging
  // in, logging out, or switching accounts, start a fresh conversation.
  // Without this, a conversation begun as one person (or as an anonymous
  // visitor) would silently carry on after a different person signs in.
  useEffect(() => {
    const identityKey = isAuthed ? `${user.role}:${user.id}` : 'anonymous';
    if (identityRef.current !== undefined && identityRef.current !== identityKey) {
      reset();
    }
    identityRef.current = identityKey;
  }, [isAuthed, user?.role, user?.id, reset]);

  const welcomeText = WELCOME_BY_ROLE[ctx.role] || WELCOME_BY_ROLE.none;

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg = { id: nextId.current++, role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // Build LLM-facing history (role/content only, no UI ids)
    const llmHistory = messages.map(({ role, content }) => ({ role, content }));

    try {
      const { reply, history } = await converse(llmHistory, trimmed, ctx);
      setMessages((prev) => [...prev, { id: nextId.current++, role: 'assistant', content: reply }]);

      // Fire-and-forget: log/refresh this conversation for the staff AI Inbox.
      extractAndLog(history, ctx, { conversationId: conversationIdRef.current }).then((convo) => {
        if (convo?.id) conversationIdRef.current = convo.id;
      });
    } catch {
      setMessages((prev) => [...prev, { id: nextId.current++, role: 'assistant', content: "Sorry, I couldn't process that just now. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  }, [messages, ctx]);

  return (
    <AIAssistantContext.Provider value={{ isOpen, open, close, toggle, messages, isTyping, sendMessage, reset, welcomeText, role: ctx.role }}>
      {children}
    </AIAssistantContext.Provider>
  );
};

export const useAIAssistant = () => {
  const c = useContext(AIAssistantContext);
  if (!c) throw new Error('useAIAssistant must be used within AIAssistantProvider');
  return c;
};
