import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Bot, User } from "lucide-react";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: 'Hi there! I am the Weave Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput("");
    const newMessages = [...messages, { role: 'user', text: userMsg } as const];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const res = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: messages
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessages([...newMessages, { role: 'model', text: data.response }]);
      } else {
        setMessages([...newMessages, { role: 'model', text: "Error: " + (data.error || "Something went wrong.") }]);
      }
    } catch (err) {
      console.error(err);
      setMessages([...newMessages, { role: 'model', text: "Network error. Is the backend running?" }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-36 right-12 z-[2000] w-96 max-w-[90vw] h-[500px] max-h-[80vh] bg-[#fcf8f6] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-[#4a3e3e]/10"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#f4dada] to-[#d8e6e0] p-4 flex justify-between items-center relative">
              <div className="absolute inset-0 bg-[#4a3e3e]/5 mix-blend-multiply pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <Bot size={20} className="text-[#4a3e3e]" />
                </div>
                <div>
                  <h3 className="font-black text-[#4a3e3e] uppercase tracking-wider text-sm">Weave Assistant</h3>
                  <p className="text-[10px] font-bold text-[#4a3e3e]/60 uppercase tracking-widest">Powered by Gemini</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center hover:bg-white transition-colors relative z-10 text-[#4a3e3e]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map((msg, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-4 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-[#4a3e3e] text-white rounded-tr-sm' 
                      : 'bg-white border border-[#4a3e3e]/5 text-[#4a3e3e] shadow-sm rounded-tl-sm'
                  }`}>
                    <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white border border-[#4a3e3e]/5 p-4 rounded-2xl rounded-tl-sm flex gap-2 items-center shadow-sm">
                    <span className="w-2 h-2 bg-[#4a3e3e]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-[#4a3e3e]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-[#4a3e3e]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-[#4a3e3e]/5 flex gap-2 items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything..."
                className="flex-1 bg-[#fcf8f6] border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#4a3e3e]/10 text-[#4a3e3e] placeholder:text-[#4a3e3e]/30"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="w-12 h-12 bg-[#4a3e3e] text-white rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-lg shadow-[#4a3e3e]/20"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <div className="fixed bottom-12 right-12 z-[2000]">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.1, rotate: isOpen ? 0 : 15 }}
          whileTap={{ scale: 0.9 }}
          className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center shadow-xl border border-[#4a3e3e]/10 transition-colors ${
            isOpen ? 'bg-[#4a3e3e] text-white' : 'bg-white text-[#4a3e3e]'
          }`}
        >
          {isOpen ? <X size={40} /> : <MessageSquare size={40} />}
        </motion.button>
      </div>
    </>
  );
}
