import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, Brain } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { sendMessageToAI, AIMessage, isAIConfigured } from '../services/aiService';

interface AIAssistantProps {
  isDarkMode?: boolean;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ isDarkMode = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastTool, setLastTool] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const configured = isAIConfigured();

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'model',
          text: configured
            ? 'Copiloto pronto.\n\nComo posso ajudar você hoje?\n\nSugestões:\n• "Quais voos ativos?"\n• "Listar operadores disponíveis"\n• "Sugira designação para o voo LA3001"\n• "Análise da operação"'
            : 'Copiloto não configurado.\n\n1. Acesse o Google AI Studio\n2. Gere uma API Key do Gemini\n3. Adicione no seu arquivo .env: VITE_GEMINI_API_KEY=sua_chave\n4. Reinicie o servidor',
          timestamp: new Date()
        }
      ]);
    }
  }, [isOpen, configured]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: AIMessage = { role: 'user', text: input.trim(), timestamp: new Date() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setLastTool('');
    const response = await sendMessageToAI(updatedMessages, (toolName) => {
      // Formatta per rendere la visualizzazione del tool più amichevole
      const dict: Record<string, string> = {
        'listar_voos_ativos': 'Consultando voos ativos...',
        'listar_operadores_disponiveis': 'Buscando operadores disponíveis...',
        'listar_veiculos_disponiveis': 'Consultando frota ativa...',
        'consultar_voo': 'Buscando detalhes do voo...',
        'analisar_operacao': 'Analisando dados globais da operação...',
        'sugerir_designacao': 'Avaliando o melhor operador...',
      };
      setLastTool(dict[toolName] || toolName);
    });
    setMessages(prev => [...prev, { role: 'model', text: response, timestamp: new Date() }]);
    setIsLoading(false);
    setLastTool('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { label: 'Voos ativos', query: 'Quais voos estão ativos?' },
    { label: 'Operadores', query: 'Listar operadores disponíveis' },
    { label: 'Análise Geral', query: 'Análise da operação' },
    { label: 'Veículos', query: 'Listar veículos disponíveis' },
  ];

  const bgColor = isDarkMode ? 'bg-slate-950/95 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md';
  const borderColor = isDarkMode ? 'border-slate-800' : 'border-slate-200';
  const headerBg = isDarkMode ? 'bg-emerald-600' : 'bg-emerald-500';
  const messageBotBg = isDarkMode ? 'bg-slate-900/80 border border-slate-800/60' : 'bg-slate-50 border border-slate-100';
  const textColor = isDarkMode ? 'text-slate-100' : 'text-slate-800';

  return (
    <>
      {/* Floating Action Button */}
      <button
        id="ai-assistant-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[9990] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer ${
          isOpen ? 'bg-slate-800 border border-slate-700' : headerBg
        }`}
        title="Copiloto de IA da Operação"
      >
        {isOpen ? <X size={22} className="text-white animate-fade-in" /> : <Sparkles size={22} className="text-white animate-pulse" />}
      </button>

      {/* Chat Window Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="ai-assistant-chat-panel"
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 250 }}
            className={`fixed top-0 right-0 bottom-0 h-screen z-[9995] w-[420px] max-w-full shadow-[-10px_0_50px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border-l ${bgColor} ${borderColor} rounded-none`}
          >
            {/* Header */}
            <div className={`${headerBg} px-4 py-4 flex items-center justify-between shrink-0 shadow-md`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Brain size={18} className="text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Copiloto Operacional</h3>
                  <p className="text-[10px] text-white/80">
                    {configured ? '● Inteligência Conectada' : '○ Chave Não Configurada'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {isLoading && lastTool && (
                  <div className="flex items-center gap-1.5 bg-slate-900/40 px-2 py-0.5 rounded-full border border-white/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[9px] text-white/90 font-mono tracking-tight">{lastTool}</span>
                  </div>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/15 text-white transition-all cursor-pointer"
                  title="Fechar Copiloto"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content list of messages */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isDarkMode ? 'bg-slate-950/40' : 'bg-slate-50/10'}`}>
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                    msg.role === 'user' ? 'bg-slate-800 border border-slate-700' : 'bg-emerald-500/10 border border-emerald-500/20'
                  }`}>
                    {msg.role === 'user' ? <User size={15} className="text-white" /> : <Bot size={15} className="text-emerald-400" />}
                  </div>
                  <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line shadow-sm border ${
                    msg.role === 'user' 
                      ? 'bg-emerald-600 border-emerald-500 text-white rounded-tr-none' 
                      : `${messageBotBg} ${textColor} rounded-tl-none`
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Bot size={15} className="text-emerald-400" />
                  </div>
                  <div className={`${messageBotBg} rounded-xl rounded-tl-none px-4 py-3 shadow-sm flex items-center`}>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions Shortcuts */}
            {configured && messages.length <= 2 && (
              <div className={`px-4 py-2 bg-slate-900/20 gap-1.5 flex items-center overflow-x-auto border-t ${borderColor} select-none shrink-0 no-scrollbar`}>
                {quickActions.map(a => (
                  <button
                    key={a.label}
                    onClick={() => {
                      setInput(a.query);
                      // Invia automaticamente dopo una frazione di secondo
                      setTimeout(() => handleSend(), 100);
                    }}
                    className={`px-3 py-1 rounded-full text-[10px] font-medium whitespace-nowrap cursor-pointer transition-all hover:scale-102 ${
                      isDarkMode 
                        ? 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800 hover:border-slate-700' 
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}

            {/* Footer Form input */}
            <div className={`p-4 border-t ${borderColor} ${isDarkMode ? 'bg-slate-950/80' : 'bg-white'} shrink-0`}>
              <div className={`flex gap-2 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'} rounded-xl border p-2 items-center`}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={configured ? 'Pergunte sobre voos, operadores...' : 'Configure a API Key para conversar...'}
                  disabled={!configured || isLoading}
                  className={`flex-1 bg-transparent text-xs ${textColor} outline-none px-2 placeholder:text-slate-500 disabled:opacity-50`}
                />
                <button
                  onClick={handleSend}
                  disabled={!configured || !input.trim() || isLoading}
                  className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-95"
                >
                  <Send size={13} className="text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
