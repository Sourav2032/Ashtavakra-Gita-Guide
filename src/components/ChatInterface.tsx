import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Sparkles, BookCheck, ShieldAlert, Award, ArrowUpRight } from "lucide-react";
import { ChatMessage, ShlokaChunk } from "../types";
import { CHAPTER_NAMES } from "./ShlokaList";

interface ChatInterfaceProps {
  onSelectShloka: (shloka: ShlokaChunk) => void;
}

const MULTILINGUAL_DATA = [
  {
    greeting: 'Om Shanti. I am the guide of Ashtavakra Gita. Ask me your spiritual questions like King Janaka, and I will resolve your doubts with the light of Vedic wisdom.',
    suggestions: ['How to attain knowledge?', 'Difference between liberation and bondage?', 'What is the Observer state?', 'How to be free from ignorance?'],
    placeholder: 'Ask Sage Ashtavakra a spiritual question...'
  },
  {
    greeting: 'ॐ शान्ति:। मैं अष्टावक्र गीता का उपदेशक हूँ। राजा जनक की भाँति अपनी आत्मिक जिज्ञासाएँ मुझसे पूछें। मैं वैदिक श्लोकों के प्रकाश में आपके संशयों का निवारण करूँगा।',
    suggestions: ['ज्ञान कैसे प्राप्त होता है?', 'मुक्ति और बंधन में क्या अंतर है?', 'साक्षी भाव (Observer) क्या है?', 'देह और अज्ञान के पाश से कैसे मुक्त हों?'],
    placeholder: 'अष्टावक्र उपदेशक से अध्यात्म सम्बन्धी प्रश्न पूछें...'
  },
  {
    greeting: 'ওঁ শান্তি। আমি অষ্টাবক্র গীতার উপদেশক। রাজা জনকের মতো আপনার আধ্যাত্মিক প্রশ্ন আমাকে জিজ্ঞাসা করুন। আমি বৈদিক শ্লোকের আলোতে আপনার সংশয় দূর করব।',
    suggestions: ['জ্ঞান কীভাবে লাভ হয়?', 'মুক্তি ও বন্ধনের মধ্যে পার্থক্য কী?', 'সাক্ষী ভাব কী?', 'অজ্ঞানের পাশ থেকে কীভাবে মুক্ত হব?'],
    placeholder: 'অষ্টাবক্র উপদেশককে আপনার আধ্যাত্মিক প্রশ্ন জিজ্ঞাসা করুন...'
  }
];

export default function ChatInterface({ onSelectShloka }: ChatInterfaceProps) {
  const [currentLangIndex, setCurrentLangIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      content: "",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cycle languages every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLangIndex(prev => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (text: string) => {
    if (!text || text.trim().length === 0) return;

    const userMsg: ChatMessage = {
      id: `m-u-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      // 1. Post Chat Query with history Context to Backend
      const chatHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          messages: chatHistory
        })
      });

      if (!response.ok) {
        throw new Error("आध्यात्मिक संपर्क बाधित हो गया (सर्वर प्रतिक्रिया त्रुटि)।");
      }

      const data = await response.json();
      if (data.success) {
        const modelMsg: ChatMessage = {
          id: `m-m-${Date.now()}`,
          role: "model",
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          grounding: data.grounding // matched vectors for grounding!
        };
        setMessages(prev => [...prev, modelMsg]);
      } else {
        throw new Error(data.error || "उत्तर प्राप्त करने में असमर्थ।");
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `m-err-${Date.now()}`,
        role: "model",
        content: `क्षमा करें, मुझे संवाद स्थापित करने में बाधा हुई: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  return (
    <div className="flex flex-col h-[520px] lg:h-[640px] bg-dark-bg rounded-2xl border border-white/10 shadow-sm overflow-hidden">
      
      {/* Header */}
      <div className="bg-[#0f0f12] border-b border-white/10 p-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gold-accent/15 flex items-center justify-center text-gold-accent animate-pulse">
            <Sparkles className="w-4 h-4 fill-gold-accent stroke-[1.5]" />
          </div>
          <div>
            <h3 className="font-serif text-sm font-semibold text-white">Spiritual Guidance Chat</h3>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping"></span>
              Active • AI Wisdom
            </p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-dark-bg" id="messages-scroller">
        {messages.map((m) => {
          const isModel = m.role === "model";
          return (
            <div key={m.id} className={`flex flex-col ${isModel ? "items-start" : "items-end"} space-y-1`}>
              <div className="text-[10px] text-gray-500 font-mono px-1">
                {isModel ? "Sage Ashtavakra" : "Seeker"} • {m.timestamp}
              </div>

              <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm leading-relaxed text-sm ${
                isModel
                  ? "bg-[#0f0f12] border border-white/10 text-gray-250 rounded-tl-sm font-serif"
                  : "bg-gradient-to-r from-gold-accent/20 to-gold-accent/10 border border-gold-accent/30 text-white rounded-tr-sm"
              }`}>
                {/* Clean formatted outputs */}
                <div 
                  key={m.id === "welcome" ? `welcome-${currentLangIndex}` : m.id}
                  className={`whitespace-pre-line leading-relaxed text-gray-200 ${m.id === "welcome" ? "animate-fade-in transition-all duration-500" : ""}`}
                >
                  {m.id === "welcome" ? MULTILINGUAL_DATA[currentLangIndex].greeting : m.content}
                </div>

                {/* Grounding Source nodes inside assistant response Card */}
                {isModel && m.grounding && m.grounding.length > 0 && (
                  <div className="mt-4 border-t border-dashed border-white/10 pt-3.5 space-y-3 animate-fade-in text-gray-300 select-none">
                    <p className="text-[10px] font-semibold text-gold-accent uppercase tracking-wider flex items-center gap-1.5">
                      <BookCheck className="w-3.5 h-3.5 text-gold-accent" />
                      वैचारिक आधार (Grounding Shlokas)
                    </p>
                    
                    <div className="grid grid-cols-1 gap-2">
                      {m.grounding.map((g, idx) => (
                        <div 
                          key={g.chunk.id} 
                          onClick={() => onSelectShloka(g.chunk)}
                          className="p-2.5 rounded-lg border border-white/5 bg-white/5 hover:border-gold-accent hover:bg-white/10 transition-all text-left cursor-pointer group"
                        >
                          <div className="flex justify-between items-center mb-1 text-[9px] font-mono text-gray-400 font-bold">
                            <span className="truncate max-w-[70%]">प्रकरण {g.chunk.chapter}: {CHAPTER_NAMES[g.chunk.chapter] || ""} • श्लोक {g.chunk.shlokaNumber}</span>
                            <span className="flex items-center gap-0.5 text-gold-accent font-semibold shrink-0">
                              {(g.score * 100).toFixed(0)}% सादृश्य
                              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </span>
                          </div>
                          <p className="font-serif text-[11px] text-white truncate line-clamp-1 mb-0.5 italic">
                            {g.chunk.sanskrit.split("\n")[0]}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate line-clamp-1">
                            {g.chunk.hindiTranslation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex flex-col items-start space-y-1 animate-pulse">
            <span className="text-[10px] text-gray-500 font-mono">Sage Ashtavakra • Reflecting...</span>
            <div className="bg-[#0f0f12] rounded-2xl rounded-tl-sm p-4 border border-white/10 inline-flex items-center gap-2">
              <LoaderCircle className="w-4 h-4 animate-spin text-gold-accent" />
              <span className="text-xs text-gray-400 font-serif italic">Contemplating the deep essence of the verses...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length === 1 && !isLoading && (
        <div className="p-4 bg-[#0f0f12] border-t border-white/10 shrink-0 space-y-2">
          <p className="text-[10px] font-semibold text-gray-500 tracking-wider uppercase flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5 text-gold-accent" />
            {currentLangIndex === 0 && "Common Questions from Seekers (Suggestions):"}
            {currentLangIndex === 1 && "जिज्ञासुओं के सामान्य प्रश्न (सुझाव):"}
            {currentLangIndex === 2 && "জিজ্ঞাসুদের সাধারণ প্রশ্ন (পরামর্শ):"}
          </p>
          <div className="flex flex-wrap gap-1.5 min-h-[40px]">
            {MULTILINGUAL_DATA[currentLangIndex].suggestions.map((s, idx) => (
              <button
                key={`${currentLangIndex}-${idx}`}
                onClick={() => handleSendMessage(s)}
                className="text-[11px] px-3 py-1.5 hover:bg-white/15 hover:text-white text-gray-300 bg-white/5 border border-white/10 rounded-xl transition-all cursor-pointer text-left animate-fade-in"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Field */}
      <form onSubmit={handleFormSubmit} className="bg-[#0f0f12] border-t border-white/10 p-3 shrink-0 flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={MULTILINGUAL_DATA[currentLangIndex].placeholder}
          disabled={isLoading}
          className="flex-1 text-sm pl-4 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-gold-accent focus:bg-[#16161a] transition-all disabled:opacity-50"
          id="chat-send-input-box"
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="py-2.5 px-4 bg-gold-accent hover:bg-gold-light active:scale-95 text-[#0a0a0c] font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none shadow-md shadow-gold-accent/10 flex items-center justify-center shrink-0"
          id="btn-chat-send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

// Inline fallback loader component for simpler react bundle
function LoaderCircle({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
