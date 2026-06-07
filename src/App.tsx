import { useState, useEffect, useRef } from "react";
import { ShlokaChunk } from "./types";
import ShlokaList, { CHAPTER_NAMES, CHAPTER_DATA } from "./components/ShlokaList";
import ChatInterface from "./components/ChatInterface";
import { BookOpen, Quote, Sparkle, AlertTriangle, Volume2, VolumeX } from "lucide-react";

const ENGLISH_FALLBACK_TRANSLATIONS: Record<string, string> = {
  "c1-s1": "King Janaka asked: O Lord! How is knowledge acquired? How does liberation happen? And how is dispassion attained? Please tell me this.",
  "c1-s2": "Sage Ashtavakra replied: My dear! If you seek liberation, avoid sensory objects like poison. Cultivate forgiveness, sincerity, compassion, contentment, and truth like nectar.",
  "c1-s3": "You are neither earth, water, fire, air, nor ether. To attain liberation, know yourself as the witness of all these, consisting of pure consciousness itself.",
  "c1-s4": "If you detach yourself from the body and rest peacefully in consciousness, you will immediately become happy, peaceful, and free from all bondage.",
  "c1-s5": "You do not belong to the priestly caste (Brahmin) or any other class, nor to any stage of life. You are not the object of any sense organ. Unattached, formless, and the witness of all things—be happy!"
};

export default function App() {
  const [shlokas, setShlokas] = useState<ShlokaChunk[]>([]);
  const [selectedShloka, setSelectedShloka] = useState<ShlokaChunk | null>(null);
  const [readShlokaIds, setReadShlokaIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ashtavakra-read-shlokas");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return [];
        }
      }
    }
    return [];
  });
  const [syncStatus, setSyncStatus] = useState<"connecting" | "synced" | "fallback" | "hidden">("synced");
  const [langTab, setLangTab] = useState<"hn" | "en">("hn");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [theme, setTheme] = useState<"dark" | "parchment">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ashtavakra-theme");
      if (saved === "parchment" || saved === "dark") return saved;
    }
    return "parchment";
  });

  // Dynamically propagate raw attribute to HTML document context
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("ashtavakra-theme", theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "parchment" : "dark");
  };

  // Automatically mark shloka as read when selected by user
  useEffect(() => {
    if (selectedShloka) {
      setReadShlokaIds(prev => {
        if (!prev.includes(selectedShloka.id)) {
          const next = [...prev, selectedShloka.id];
          localStorage.setItem("ashtavakra-read-shlokas", JSON.stringify(next));
          return next;
        }
        return prev;
      });
    }
  }, [selectedShloka]);

  const handleToggleRead = (id: string) => {
    setReadShlokaIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem("ashtavakra-read-shlokas", JSON.stringify(next));
      return next;
    });
  };

  const handleResetProgress = () => {
    setReadShlokaIds([]);
    localStorage.removeItem("ashtavakra-read-shlokas");
  };

  // Sync available shlokas from Express backend
  const fetchShlokas = async () => {
    try {
      const response = await fetch("/api/shlokas");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.shlokas && data.shlokas.length > 0) {
          setShlokas(data.shlokas);
          setSyncStatus("synced");
          
          // Optionally preserve selected shloka references
          if (selectedShloka) {
            const preserved = data.shlokas.find((s: ShlokaChunk) => s.id === selectedShloka.id);
            if (preserved) setSelectedShloka(preserved);
          } else {
            setSelectedShloka(data.shlokas[0]);
          }
          return;
        }
      }
      setSyncStatus("fallback");
    } catch (err) {
      console.error("Error syncing shlokas from Express server, using client side backup dataset:", err);
      setSyncStatus("fallback");
    }
  };

  useEffect(() => {
    fetchShlokas();
  }, []);

  // Browser TTS state management
  const stopSpeaking = () => {
    setIsSpeaking(false);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const startSpeaking = () => {
    if (!selectedShloka || typeof window === "undefined" || !window.speechSynthesis) return;

    // Stop past speaker utterances
    window.speechSynthesis.cancel();
    setIsSpeaking(true);

    // 1. Sanskrit recitation setup
    try {
      const sanskritText = `प्रकरण ${selectedShloka.chapter}, श्लोक ${selectedShloka.shlokaNumber}. \n\n ${selectedShloka.sanskrit}`;
      const sanskritUtterance = new SpeechSynthesisUtterance(sanskritText);
      sanskritUtterance.lang = "hi-IN"; // Hindi handles Sanskrit pronunciation beautifully
      sanskritUtterance.rate = 0.82; // Dignified slower tempo for sacred verses

      // 2. Hindi translation setup
      const translationText = `अनुवाद. ${selectedShloka.hindiTranslation}. ${selectedShloka.hindiChhand ? `\n\n पद्य छंद. ${selectedShloka.hindiChhand}` : ""}`;
      const translationUtterance = new SpeechSynthesisUtterance(translationText);
      translationUtterance.lang = "hi-IN";
      translationUtterance.rate = 0.88;

      // Sequence the speech components
      sanskritUtterance.onend = () => {
        // Only run next utterance if speech wasn't canceled/interrupted
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.speak(translationUtterance);
        }
      };

      const resetSpeakerState = () => {
        setIsSpeaking(false);
      };

      sanskritUtterance.onerror = resetSpeakerState;
      translationUtterance.onerror = resetSpeakerState;
      translationUtterance.onend = resetSpeakerState;

      window.speechSynthesis.speak(sanskritUtterance);
    } catch (error) {
      console.error("Failed to start TTS engine:", error);
      setIsSpeaking(false);
    }
  };

  // Cancel speech on shloka transitions or unmount
  useEffect(() => {
    stopSpeaking();
  }, [selectedShloka]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const shlokaCardRef = useRef<HTMLDivElement>(null);

  const handleSelectShloka = (shloka: ShlokaChunk) => {
    setSelectedShloka(shloka);
    // Smoothly scroll selected shloka details card into view
    if (shlokaCardRef.current) {
      shlokaCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-[#e0e0e0] flex flex-col selection:bg-gold-accent/30 selection:text-white">
      
      {/* Header Banner representing spiritual elegance */}
      <header className="bg-dark-surface border-b border-white/10 py-5 px-6 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-3 text-center md:text-left">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-gold-accent to-gold-light flex items-center justify-center text-[#0a0a0c] shadow-md font-bold text-2xl">
              अ
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-white tracking-tight flex items-center gap-1.5 justify-center md:justify-start">
                श्रीमद् अष्टावक्र गीता 
                <Sparkle className="w-4 h-4 text-gold-accent fill-gold-accent animate-spin" style={{ animationDuration: '8s' }} />
              </h1>
              <p className="text-gray-400 text-xs font-serif italic mt-0.5 tracking-wide">
                The Supreme Wisdom of Sage Ashtavakra
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center md:justify-end">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 hover:border-gold-accent hover:bg-white/10 text-gold-accent rounded-full text-[11px] font-semibold transition-all duration-300 cursor-pointer shadow-sm"
              id="theme-toggle-btn"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? (
                <>
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Light Mode ☀️</span>
                </>
              ) : (
                <>
                  <Sparkle className="w-3.5 h-3.5 text-gold-light" />
                  <span>Dark Mode 🌙</span>
                </>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* Main Grid Body */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Bento Module Column: Shloka Inventory */}
        <div className="lg:col-span-5 flex flex-col h-full">
          
          {/* Shloka Directory List */}
          <ShlokaList 
            shlokas={shlokas} 
            selectedShloka={selectedShloka} 
            onSelectShloka={handleSelectShloka} 
            readShlokaIds={readShlokaIds}
            onToggleRead={handleToggleRead}
            onResetProgress={handleResetProgress}
          />

        </div>

        {/* Right Bento Module Column: Immersive Viewport & RAG Chat console */}
        <div className="lg:col-span-7 space-y-6 flex flex-col">
          
          {/* Active Shloka detailed viewer Card (Styled like premium holy parchment) */}
          <section 
            ref={shlokaCardRef}
            id="shloka-details-viewport"
            className="relative bg-dark-card rounded-3xl border border-white/10 p-6 lg:p-8 shadow-inner overflow-hidden flex flex-col gap-5 min-h-[220px]"
          >
            {/* Background design accents */}
            <div className="absolute right-0 bottom-0 select-none opacity-[0.03] translate-x-12 translate-y-12">
              <BookOpen className="w-64 h-64 text-gold-accent" />
            </div>

            {selectedShloka ? (
              <div className="space-y-4 animate-fade-in relative z-10">
                
                {/* Verse Chapter Header */}
                <div className="flex flex-col border-b border-white/5 pb-3 gap-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-serif text-sm font-semibold text-gold-accent tracking-wider font-sans">
                        Chapter {selectedShloka.chapter}: {CHAPTER_DATA[selectedShloka.chapter]?.en || ""} • Verse {selectedShloka.shlokaNumber}
                      </span>
                      <button
                        onClick={isSpeaking ? stopSpeaking : startSpeaking}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-300 shadow-sm border ${
                          isSpeaking
                            ? "bg-rose-950/40 text-rose-400 border-rose-800/40 animate-pulse hover:bg-rose-950/60"
                            : "bg-white/5 text-gold-accent border-white/10 hover:bg-white/10 hover:border-gold-accent/30"
                        }`}
                        title={isSpeaking ? "सुनना बंद करें" : "श्लोक एवं अनुवाद पाठ सुनें"}
                      >
                        {isSpeaking ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>Stop Audio 🔇</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-gold-accent shrink-0" />
                            <span>Play Audio 🔊</span>
                          </>
                        )}
                      </button>
                    </div>
                    <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full text-gold-accent bg-white/5 border border-white/10">
                      अष्टावक्र गीता
                    </span>
                  </div>
                  {CHAPTER_DATA[selectedShloka.chapter] && (
                    <div className="text-[11px] text-gray-400 font-sans italic flex flex-wrap gap-1.5 items-center leading-relaxed">
                      <span>"{CHAPTER_DATA[selectedShloka.chapter].desc}"</span>
                      <span className="text-gray-650">•</span>
                      <span className="text-gray-500 font-normal">{CHAPTER_DATA[selectedShloka.chapter].hi}</span>
                    </div>
                  )}
                </div>

                {/* Sanskrit Verse block */}
                <div className="text-center py-2">
                  <Quote className="w-6 h-6 text-gold-accent/40 rotate-180 mb-1 inline-block" />
                  <p className="font-serif text-lg font-bold text-white leading-relaxed whitespace-pre-wrap select-all tracking-wide">
                    {selectedShloka.sanskrit}
                  </p>
                </div>

                {/* Language Tabs Control */}
                <div className="flex justify-end border-b border-white/5 pb-2">
                  <div className="bg-black/40 p-1 rounded-xl inline-flex items-center gap-1 border border-white/5 shadow-inner">
                    <button
                      onClick={() => setLangTab("hn")}
                      className={`px-3 py-1 text-xs rounded-lg transition-all duration-200 cursor-pointer ${
                        langTab === "hn"
                          ? "bg-gold-accent/20 text-gold-accent font-semibold border border-gold-accent/10 shadow-sm"
                          : "text-gray-400 hover:text-white border border-transparent"
                      }`}
                    >
                      हिन्दी (Hindi)
                    </button>
                    <button
                      onClick={() => setLangTab("en")}
                      className={`px-3 py-1 text-xs rounded-lg transition-all duration-200 cursor-pointer ${
                        langTab === "en"
                          ? "bg-gold-accent/20 text-gold-accent font-semibold border border-gold-accent/10 shadow-sm"
                          : "text-gray-400 hover:text-white border border-transparent"
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                {langTab === "hn" ? (
                  <>
                    {/* Literal Hindi Translation Block */}
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1.5 animate-fade-in">
                      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gold-accent font-sans">
                        हिन्दी अनुवाद (Literal Translation):
                      </h4>
                      <p className="text-gray-300 text-sm leading-relaxed font-sans font-medium">
                        {selectedShloka.hindiTranslation}
                      </p>
                    </div>

                    {/* Optional Hindi Chhand poetry block */}
                    {selectedShloka.hindiChhand && (
                      <div className="bg-[#1a1a1e] p-4 rounded-2xl border border-white/5 space-y-1.5 animate-fade-in">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gold-accent font-sans">
                          हिन्दी पद्य छंद (Hindi Poetic Verse Chhanda):
                        </h4>
                        <p className="text-gray-300 text-xs italic font-serif leading-relaxed whitespace-pre-wrap font-medium">
                          {selectedShloka.hindiChhand}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* English Translation Block */}
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1.5 animate-fade-in">
                      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gold-accent font-sans">
                        English Translation (अंग्रेजी अनुवाद):
                      </h4>
                      <p className="text-gray-300 text-sm leading-relaxed font-sans font-medium">
                        {selectedShloka.englishTranslation ||
                         ENGLISH_FALLBACK_TRANSLATIONS[selectedShloka.id] || (
                           <span className="text-gray-500 italic block">
                             English translation coming soon... You can ask Sage Ashtavakra in the chat below to translate and decode this verse for you in English.
                           </span>
                         )}
                      </p>
                    </div>
                  </>
                )}

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-500 gap-3">
                <BookOpen className="w-14 h-14 stroke-[1.2] text-gold-accent/40 animate-pulse" />
                {shlokas.length > 0 ? (
                  <p className="font-serif text-sm italic text-gray-400">अध्याय सूची से किसी श्लोक को पढ़ने के लिए चुनें...</p>
                ) : (
                  <div className="max-w-md space-y-2">
                    <p className="font-serif text-base font-semibold text-white">अष्टावक्र गीता ग्रंथ लोड हो रहा है...</p>
                    <p className="text-xs text-gray-400 leading-relaxed font-sans">
                      कृपया प्रतीक्षा करें जब तक सम्पूर्ण अष्टावक्र गीता (298 श्लोक) ज्ञानपीठ में स्थापित हो रही है।
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Grounded RAG Chat system console */}
          <ChatInterface onSelectShloka={handleSelectShloka} />

        </div>

      </main>

      {/* Humble Footer */}
      <footer className="bg-dark-surface border-t border-white/10 py-5 px-6 text-center text-gray-500 text-xs shrink-0 select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>© 2026 अष्टावक्र गीता आध्यात्मिक AI मंच | अद्वैत वेदांत दर्शन</span>
          <span className="font-serif italic text-gold-accent">न कर्ताऽसि न भोक्ताऽसि मुक्त एवासि सर्वदा</span>
        </div>
      </footer>

    </div>
  );
}
