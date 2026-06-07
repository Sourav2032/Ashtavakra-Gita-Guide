import { useState, useMemo, useRef } from "react";
import { Search, Compass, BookOpen, Layers, Trophy, RotateCcw, Check } from "lucide-react";
import { ShlokaChunk } from "../types";

export const CHAPTER_DATA: Record<number, { hi: string; en: string; desc: string }> = {
  1: { hi: 'आत्मा के अनुभव का उपदेश', en: 'Saksi', desc: 'Vision of the Self as the All-pervading Witness' },
  2: { hi: 'जनक का अनुभव', en: 'Ascaryam', desc: 'Marvel of the Infinite Self Beyond Nature' },
  3: { hi: 'आक्षेप पूर्वक गुरु का उपदेश', en: 'Atmadvaita', desc: 'Self in All and All in the Self' },
  4: { hi: 'जनक का निश्चय', en: 'Sarvamatma', desc: 'Knower and the Non-knower of the Self' },
  5: { hi: 'लय का उपदेश', en: 'Laya', desc: 'Stages of Dissolution of Consciousness' },
  6: { hi: 'यथार्थ ज्ञानोपदेश', en: 'Prakrteh Parah', desc: 'Irrelevance of Dissolution of Consciousness' },
  7: { hi: 'जनक का अनुभव', en: 'Santa', desc: 'Tranquil and Boundless Ocean of the Self' },
  8: { hi: 'बन्ध और मोक्ष का स्वरूप', en: 'Moksa', desc: 'Absolute and Eternal Freedom from all kinds of self assumed Bondages' },
  9: { hi: 'वैराग्य निरूपण', en: 'Nirveda', desc: 'Indifference' },
  10: { hi: 'उपशम', en: 'Vairagya', desc: 'Dispassion' },
  11: { hi: 'ज्ञानाष्टक', en: 'Cittrupa', desc: 'Self as Pure and Radiant Intelligence' },
  12: { hi: 'जनक की स्थिति', en: 'Svabhava', desc: 'Ascent of Contemplation' },
  13: { hi: 'जनक की सुखमयी अवस्था', en: 'Yathasukham', desc: 'Transcendent Bliss' },
  14: { hi: 'शान्ति का उपदेश', en: 'Isvara', desc: 'Natural Dissolution of the Mind' },
  15: { hi: 'तत्त्व का उपदेश', en: 'Tattvam', desc: 'Unborn Self or Brahman' },
  16: { hi: 'विशेष ज्ञान का उपदेश', en: 'Svasthya', desc: 'Self-Abidance through Obliteration of the World' },
  17: { hi: 'तत्त्व स्वरूप का वर्णन', en: 'Kaivalya', desc: 'Absolute Aloneness of the Self' },
  18: { hi: 'शम का उपदेश', en: 'Jivanmukti', desc: 'State of the being where the individual has attained salvation while being alive' },
  19: { hi: 'आत्म विश्रान्ति निरूपण', en: 'Svamahima', desc: 'Majesty of the Self' },
  20: { hi: 'जीवनमुक्ति निरूपण', en: 'Akincanabhava', desc: 'Transcendence of the Self' }
};

export const CHAPTER_NAMES: Record<number, string> = Object.keys(CHAPTER_DATA).reduce((acc, key) => {
  const numKey = Number(key);
  acc[numKey] = CHAPTER_DATA[numKey].hi;
  return acc;
}, {} as Record<number, string>);

interface ShlokaListProps {
  shlokas: ShlokaChunk[];
  selectedShloka: ShlokaChunk | null;
  onSelectShloka: (shloka: ShlokaChunk) => void;
  readShlokaIds?: string[];
  onToggleRead?: (id: string) => void;
  onResetProgress?: () => void;
}

export default function ShlokaList({ 
  shlokas, 
  selectedShloka, 
  onSelectShloka,
  readShlokaIds = [],
  onToggleRead,
  onResetProgress
}: ShlokaListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChapter, setSelectedChapter] = useState<string>("all");
  const verseListRef = useRef<HTMLDivElement>(null);

  const handleChapterSelect = (chapter: string) => {
    setSelectedChapter(chapter);
    if (verseListRef.current) {
      verseListRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Progress and spiritual scaling calculations
  const totalShlokasCount = 298;
  const readCount = readShlokaIds.length;
  const percentage = Math.min(100, Math.round((readCount / totalShlokasCount) * 100));

  const rankInfo = useMemo(() => {
    if (readCount === totalShlokasCount) return { hindi: "जीवन्मुक्त", english: "Liberated Soul" };
    if (readCount >= 150) return { hindi: "आत्मज्ञानी", english: "Self-Realized" };
    if (readCount >= 50) return { hindi: "साधक", english: "Sadhak" };
    if (readCount >= 10) return { hindi: "मननशील", english: "Contemplator" };
    return { hindi: "जिज्ञासु", english: "Seeker" };
  }, [readCount]);

  // Dynamically extract available chapters
  const chapters = useMemo(() => {
    const caps = new Set<number>();
    shlokas.forEach(s => caps.add(s.chapter));
    return Array.from(caps).sort((a, b) => a - b);
  }, [shlokas]);

  // Filter shlokas by text and selected chapter
  const filteredShlokas = useMemo(() => {
    return shlokas.filter(s => {
      const matchesChapter = selectedChapter === "all" || String(s.chapter) === selectedChapter;
      const cleanSearch = searchQuery.toLowerCase().trim();
      const matchesQuery = 
        cleanSearch === "" ||
        s.sanskrit.toLowerCase().includes(cleanSearch) ||
        s.hindiTranslation.toLowerCase().includes(cleanSearch) ||
        (s.hindiChhand && s.hindiChhand.toLowerCase().includes(cleanSearch)) ||
        (s.englishTranslation && s.englishTranslation.toLowerCase().includes(cleanSearch)) ||
        `अध्याय ${s.chapter}`.includes(cleanSearch) ||
        `श्लोक ${s.shlokaNumber}`.includes(cleanSearch);
      
      return matchesChapter && matchesQuery;
    });
  }, [shlokas, searchQuery, selectedChapter]);

  return (
    <div className="flex flex-col h-full bg-[#0f0f12] rounded-2xl border border-white/10 shadow-sm p-5 space-y-4">
      <div className="space-y-1.5">
        <h3 className="font-serif text-lg font-medium text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-gold-accent" />
          Shloka Collection (श्लोक संग्रह)
        </h3>
        <p className="text-gray-400 text-xs">
          The complete Ashtavakra Gita (298 verses) is established in this wisdom sanctuary.
        </p>
      </div>

      {/* Gamified Spiritual Progress Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 shadow-inner hover:bg-white/[0.07] transition-all" id="spiritual-progress-card">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gold-accent animate-pulse" />
            <span className="text-xs font-semibold text-white tracking-wide uppercase">Spiritual Growth</span>
          </div>
          <span className="text-[10px] font-semibold text-gold-accent bg-gold-accent/10 px-2 py-0.5 rounded-full border border-gold-accent/20">
            {rankInfo.hindi} ({rankInfo.english})
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-medium text-gray-400">
            <span>{readCount} of 298 shlokas parsed</span>
            <span className="text-white font-semibold font-mono">{percentage}%</span>
          </div>
          <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5">
            <div 
              className="bg-gradient-to-r from-gold-accent to-gold-light h-full rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-1 border-t border-white/5">
          <span className="text-[9px] text-gray-500 italic">
            {percentage === 100 ? "Pure Self Realization! (जीवन्मुक्त)" : "Study shlokas to advance."}
          </span>
          {readCount > 0 && onResetProgress && (
            <button
              onClick={onResetProgress}
              className="text-[9px] text-rose-400/80 hover:text-rose-400 transition-all cursor-pointer underline flex items-center gap-1 hover:no-underline font-semibold"
              title="Reset progress metrics"
            >
              Reset progress
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search / खोजें..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:outline-none focus:border-gold-accent focus:bg-[#16161a] transition-all"
          id="search-shlokas-box"
        />
      </div>

      {/* Chapters filter tags */}
      <div className="space-y-2">
        <label className="text-[10px] font-semibold text-gray-500 tracking-wider uppercase flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-gold-accent" />
          Chapter Filter / प्रकरण चयन
        </label>
        <div className="flex flex-wrap gap-1.5" id="chapter-filter-tags">
          <button
            onClick={() => handleChapterSelect("all")}
            className={`px-3 py-1.5 text-xs rounded-xl border transition-all cursor-pointer ${
              selectedChapter === "all"
                ? "bg-gold-accent/15 text-gold-accent border-gold-accent/30 font-semibold"
                : "bg-white/5 text-gray-450 border-white/5 hover:bg-white/10 hover:text-white"
            }`}
          >
            All Chapters (सभी)
          </button>
          {chapters.map(c => {
            const block = CHAPTER_DATA[c];
            return (
              <button
                key={c}
                onClick={() => handleChapterSelect(String(c))}
                className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] active:scale-95 duration-150 text-left ${
                  selectedChapter === String(c)
                    ? "bg-gold-accent/15 text-gold-accent border-gold-accent/30 font-medium"
                    : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="flex flex-col gap-0.5 leading-tight">
                  <span className={`text-[11px] font-semibold ${selectedChapter === String(c) ? 'text-gold-accent' : 'text-gray-300'}`}>
                    Chapter {c}: {block?.en}
                  </span>
                  <span className="text-[10px] text-gray-500 font-sans">
                    अध्याय {c}: {block?.hi}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Filter Title Header */}
      <div 
        ref={verseListRef}
        className="flex flex-col gap-1 pb-2.5 border-b border-white/10" 
        id="active-chapter-summary-header"
      >
        <div className="flex justify-between items-start gap-2">
          <span className="font-sans text-xs font-semibold text-gray-200">
            {selectedChapter === "all" 
              ? "Showing All Verses (सभी श्लोक)" 
              : `Chapter ${selectedChapter}: ${CHAPTER_DATA[Number(selectedChapter)]?.en} (${CHAPTER_DATA[Number(selectedChapter)]?.hi})`}
          </span>
          <span className="text-[10px] bg-white/5 text-gray-400 px-2.5 py-0.5 rounded-full shrink-0 font-mono font-bold border border-white/5">
            {filteredShlokas.length} {filteredShlokas.length === 1 ? "verse" : "verses"}
          </span>
        </div>
        {selectedChapter !== "all" && CHAPTER_DATA[Number(selectedChapter)] && (
          <p className="text-[11px] text-gold-accent/80 italic font-medium leading-relaxed">
            "{CHAPTER_DATA[Number(selectedChapter)].desc}"
          </p>
        )}
      </div>

      {/* Shloka scroll list */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[450px] lg:max-h-[720px]" id="shloka-list-container">
        {filteredShlokas.length > 0 ? (
          filteredShlokas.map((s) => {
            const isSelected = selectedShloka?.id === s.id;
            const isRead = readShlokaIds.includes(s.id);
            return (
              <div
                key={s.id}
                onClick={() => onSelectShloka(s)}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? "bg-white/10 border-gold-accent/50 shadow-sm shadow-gold-accent/5"
                    : "bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10"
                }`}
                id={`shloka-card-${s.id}`}
              >
                <div className="flex justify-between items-center mb-2 gap-2">
                  <span className="text-[10px] font-medium px-2 py-1 rounded text-gray-300 bg-white/5 leading-relaxed break-words flex-1">
                    Ch {s.chapter} ({CHAPTER_DATA[s.chapter]?.en || ""}) • Verse {s.shlokaNumber}
                  </span>
                  {isRead && (
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleRead?.(s.id);
                      }}
                      className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-500/20 inline-flex items-center gap-0.5 shrink-0"
                      title="Click to mark as unread"
                    >
                      <Check className="w-2.5 h-2.5" /> Read
                    </span>
                  )}
                </div>
                <p className="font-serif text-gold-accent text-xs font-semibold leading-relaxed truncate mb-1">
                  {s.sanskrit.split("\n")[0]}
                </p>
                <p className="text-gray-400 text-[11px] leading-snug line-clamp-2">
                  {s.hindiTranslation}
                </p>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500 space-y-2">
            <Compass className="w-8 h-8 text-gray-600 stroke-[1.5]" />
            <p className="text-xs">कोई श्लोक अनुपलब्ध है।</p>
          </div>
        )}
      </div>
    </div>
  );
}
