import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vvdzbnxhqdojeyrvhtvf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2ZHpibnhocWRvamV5cnZodHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTUzOTAsImV4cCI6MjA4MjU3MTM5MH0.W7TF-LpCUSEmruhtGDlK9jOXermYTAJeFIVcwpWp3s8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const getSignature = () => {
  let sig = localStorage.getItem('echo_signature');
  if (!sig) {
    sig = crypto.randomUUID();
    localStorage.setItem('echo_signature', sig);
  }
  return sig;
};

const GridTimer = ({ createdAt }) => {
  const [hours, setHours] = useState(48);
  useEffect(() => {
    const calc = () => {
      const diff = (new Date(createdAt).getTime() + 172800000) - Date.now();
      setHours(Math.max(0, Math.floor(diff / 3600000)));
    };
    calc();
    const inv = setInterval(calc, 60000);
    return () => clearInterval(inv);
  }, [createdAt]);
  return <span className="text-[9px] uppercase tracking-widest text-stone-500">{hours}h left</span>;
};

const FullTimer = ({ createdAt }) => {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const calc = () => {
      const diff = (new Date(createdAt).getTime() + 172800000) - Date.now();
      if (diff <= 0) { setTimeLeft("00h 00m 00s"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`);
    };
    calc();
    const inv = setInterval(calc, 1000);
    return () => clearInterval(inv);
  }, [createdAt]);
  return <span>{timeLeft}</span>;
};

function App() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [selectedEcho, setSelectedEcho] = useState(null);
  const [text, setText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [echoes, setEchoes] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const signature = useMemo(() => getSignature(), []);

  useEffect(() => {
    fetchEchoes();
    fetchNotifications();
    const inv = setInterval(fetchNotifications, 20000);
    return () => clearInterval(inv);
  }, [signature]);

  async function fetchEchoes() {
    const limit = new Date(Date.now() - 172800000).toISOString();
    const { data } = await supabase.from('echoes').select('*, replies(*)').gt('created_at', limit).order('created_at', { ascending: false });
    if (data) setEchoes(data);
  }

  async function fetchNotifications() {
    if (!signature) return;
    const { data } = await supabase.from('replies').select(`id, content, created_at, is_read, echoes!inner(signature_id, content)`).eq('echoes.signature_id', signature).order('created_at', { ascending: false }).limit(20);
    if (data) setNotifications(data);
  }

  const handleOpenNotifs = async () => {
    setIsNotifOpen(true);
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length > 0) {
      await supabase.from('replies').update({ is_read: true }).in('id', unreadIds);
      fetchNotifications();
    }
  };

  const handleRelease = async () => {
    if (!text.trim()) return;
    const { error } = await supabase.from('echoes').insert([{ content: text, signature_id: signature }]);
    if (!error) { setText(""); setIsPosting(false); fetchEchoes(); }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedEcho) return;
    const { error } = await supabase.from('replies').insert([{ echo_id: selectedEcho.id, content: replyText }]);
    if (!error) { 
      setReplyText(""); 
      fetchEchoes();
      setSelectedEcho(null); 
    }
  };

  const hasUnread = notifications.some(n => !n.is_read);

  return (
    <div className="bg-[#050505] text-white font-serif h-screen w-screen overflow-hidden relative selection:bg-stone-800">
      
      <header className="fixed top-0 left-0 w-full z-[100] px-8 pt-8 flex justify-between items-start bg-gradient-to-b from-[#050505] via-[#050505]/80 to-transparent pb-24 pointer-events-none">
        <div className="w-10 pointer-events-auto"></div>
        <button onClick={() => setIsAboutOpen(true)} className="group flex flex-col items-center focus:outline-none pointer-events-auto">
          <h1 className="text-2xl uppercase tracking-[0.6em] font-extralight text-stone-100 transition-all duration-700">ECHO</h1>
          <span className="text-[10px] uppercase tracking-[0.3em] text-stone-400 mt-2 font-sans">Seek the Silence</span>
        </button>

        <button onClick={handleOpenNotifs} className="relative p-4 flex items-center justify-center pointer-events-auto focus:outline-none">
           <AnimatePresence>
            {hasUnread && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.5, 1] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute bg-white rounded-full blur-xl w-10 h-10"
              />
            )}
          </AnimatePresence>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={hasUnread ? "white" : "#444"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 transition-colors duration-500">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            {hasUnread && <circle cx="18" cy="6" r="3" fill="white" stroke="#050505" strokeWidth="2" />}
          </svg>
        </button>
      </header>

      {/* --- GRID FEED (Break-All Implemented) --- */}
      <main className="h-full w-full overflow-y-auto pt-48 px-8 pb-40 no-scrollbar">
        {echoes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {echoes.map((echo) => (
              <div
                key={echo.id}
                onClick={() => setSelectedEcho(echo)}
                className="group relative bg-stone-900/10 border border-stone-800/40 p-8 rounded-[2.5rem] cursor-pointer hover:bg-stone-900/30 transition-all flex flex-col justify-between h-64 overflow-hidden"
              >
                {/* break-all ensures long single strings don't leak out of tile */}
                <p className="text-lg italic font-light text-stone-300 leading-relaxed line-clamp-4 whitespace-pre-wrap break-all">
                  "{echo.content}"
                </p>
                <div className="mt-6 flex justify-between items-center opacity-40 group-hover:opacity-100">
                   <GridTimer createdAt={echo.created_at} />
                   <span className="text-[9px] uppercase tracking-widest text-stone-500">View</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[50vh] flex flex-col items-center justify-center text-center opacity-30 px-6">
            <h2 className="text-xl md:text-2xl uppercase tracking-[1em] font-extralight mb-4">The void is silent</h2>
            <p className="text-[10px] uppercase tracking-[0.8em] font-extralight text-stone-300">Be the first to whisper into the dark</p>
          </div>
        )}
      </main>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[150]">
        <motion.button 
          onClick={() => setIsPosting(true)}
          animate={{ scale: [1, 1.05, 1], boxShadow: ["0 0 15px rgba(255,255,255,0.1)", "0 0 30px rgba(255,255,255,0.3)", "0 0 15px rgba(255,255,255,0.1)"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl focus:outline-none"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </motion.button>
      </div>

      {/* --- POPUP VIEW (Layout Fixes) --- */}
      <AnimatePresence>
        {selectedEcho && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10"
          >
            <div onClick={() => setSelectedEcho(null)} className="absolute inset-0 bg-black/95 backdrop-blur-xl" />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} 
              className="relative w-full max-w-6xl bg-[#0a0a0a] border border-stone-800/60 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-full max-h-[90vh]"
            >
              {/* LEFT SIDE: Original Post (Centered & Unbreakable) */}
              <div className="flex-[1.4] overflow-y-auto no-scrollbar flex flex-col justify-center items-center p-10 border-b md:border-b-0 md:border-r border-stone-800/30 bg-black/20 relative">
                <p className="text-2xl md:text-3xl lg:text-4xl leading-relaxed font-light italic text-white text-center whitespace-pre-wrap break-all w-full max-w-xl">
                  "{selectedEcho.content}"
                </p>
                <div className="mt-12 flex items-center gap-3 opacity-40">
                  <div className="h-[1px] w-8 bg-stone-500"></div>
                  <div className="text-[10px] uppercase tracking-[0.5em] text-stone-400 font-sans">
                    <FullTimer createdAt={selectedEcho.created_at} />
                  </div>
                  <div className="h-[1px] w-8 bg-stone-500"></div>
                </div>
              </div>

              {/* RIGHT SIDE: Chat-style Cards (Unbreakable) */}
              <div className="flex-1 flex flex-col h-full bg-[#080808] min-w-0"> {/* min-w-0 helps flex containers with long text */}
                <div className="p-6 border-b border-stone-800/30 flex justify-between items-center bg-[#0a0a0a]">
                  <span className="text-[10px] uppercase tracking-[0.4em] text-stone-500 font-sans font-bold">Resonances</span>
                  <button onClick={() => setSelectedEcho(null)} className="text-stone-600 hover:text-white transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-gradient-to-b from-transparent to-stone-900/10">
                  {selectedEcho.replies && selectedEcho.replies.length > 0 ? (
                    selectedEcho.replies.map((r, i) => (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} key={r.id} className="bg-stone-900/20 border border-stone-800/40 p-5 rounded-2xl backdrop-blur-md shadow-sm">
                        <p className="text-stone-300 text-sm italic font-extralight leading-relaxed break-all whitespace-pre-wrap">{r.content}</p>
                        <div className="text-[8px] uppercase tracking-tighter text-stone-700 mt-3 font-sans border-t border-stone-800/30 pt-2">Resonance #{i + 1}</div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
                      <div className="w-10 h-[1px] bg-stone-500"></div>
                      <span className="italic text-[11px] tracking-widest uppercase font-sans">The silence remains</span>
                    </div>
                  )}
                </div>
                <div className="p-6 border-t border-stone-800/30 bg-[#0a0a0a]">
                  <div className="flex items-center gap-3 bg-stone-900/60 rounded-2xl px-5 py-3 border border-stone-800/50 focus-within:border-stone-600 transition-all">
                    <textarea 
                      value={replyText} 
                      onChange={(e) => setReplyText(e.target.value)} 
                      placeholder="Whisper back..." 
                      className="flex-1 bg-transparent border-none outline-none italic text-sm text-stone-200 py-1 resize-none h-8 no-scrollbar break-all"
                      maxLength={1000}
                    />
                    <button onClick={handleSendReply} className="text-stone-500 hover:text-white transition-all transform hover:scale-110 active:scale-95">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPosting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-[#050505] flex flex-col items-center justify-center p-8">
            <h1 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl md:text-9xl tracking-[0.8em] font-extralight text-white opacity-5 select-none pointer-events-none uppercase z-0 text-center w-full"> &nbsp;ECHO</h1>
            <div className="max-w-xl w-full text-center relative z-10">
              <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Whisper into the void..." className="w-full bg-transparent border-none text-3xl md:text-4xl text-center outline-none italic font-light min-h-[300px] text-white whitespace-pre-wrap no-scrollbar break-all" maxLength={800} />
              <div className="flex justify-center gap-12 mt-12">
                <button onClick={() => setIsPosting(false)} className="text-[10px] uppercase text-stone-700 tracking-[0.4em] hover:text-stone-400 transition-colors font-sans">Cancel</button>
                <button onClick={handleRelease} className="px-14 py-4 rounded-full border border-stone-800 text-[10px] uppercase tracking-[0.6em] hover:bg-white hover:text-black transition-all shadow-xl font-sans">Release</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- NOTIFICATION SIDEBAR (Break-All Fixed) --- */}
      <AnimatePresence>
        {isNotifOpen && (
          <>
            <div onClick={() => setIsNotifOpen(false)} className="fixed inset-0 z-[250] bg-transparent" />
            <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} className="fixed right-0 top-0 h-full w-80 bg-[#0a0a0a]/98 backdrop-blur-3xl z-[300] p-8 border-l border-stone-900 shadow-2xl">
               <div className="flex justify-between items-center mb-12">
                  <h2 className="text-[10px] uppercase tracking-[0.5em] text-stone-500 font-sans">The Secret Log</h2>
                  <button onClick={() => setIsNotifOpen(false)} className="text-2xl font-light hover:rotate-90 transition-transform">×</button>
               </div>
               <div className="space-y-8 overflow-y-auto h-[80vh] no-scrollbar text-left">
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div key={n.id} className="border-b border-stone-900 pb-6">
                        <p className="text-[9px] text-stone-600 mb-2 uppercase tracking-widest italic truncate break-all">Echo: "{n.echoes?.content}"</p>
                        <p className="text-stone-200 text-sm italic font-light leading-relaxed whitespace-pre-wrap break-all">"{n.content}"</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] md:text-[11px] uppercase tracking-[0.8em] font-extralight text-stone-700 text-center mt-20 font-sans">You have no Resonance</p>
                  )}
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAboutOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/98 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center" onClick={() => setIsAboutOpen(false)}>
            <div className="max-w-xl flex flex-col items-center">
              <h2 className="text-4xl md:text-5xl tracking-[0.6em] font-extralight text-stone-100 mb-10 uppercase">ECHO</h2>
              <p className="text-2xl italic font-extralight text-stone-300 leading-relaxed mb-10">"A fleeting space for the things we carry. No accounts, no history, no judgment. Every thought fades after 48 hours."</p>
              <p className="text-[10px] uppercase tracking-[0.8em] text-stone-600 font-sans mb-20">48H Lifecycle • No Identity • Pure Echo</p>
              <div className="pt-12 border-t border-stone-900 w-full" onClick={(e) => e.stopPropagation()}>
                <p className="text-[10px] uppercase tracking-[0.4em] text-stone-700 mb-6 font-sans">Architect of ECHO</p>
                <h3 className="text-xl font-light tracking-widest text-stone-200 mb-4 font-sans">J•J•J</h3>
                <div className="flex gap-8 justify-center items-center">
                  <a href="https://github.com/j-j-j-github" target="_blank" rel="noreferrer" className="text-stone-600 hover:text-white transition-all text-[10px] uppercase tracking-widest border-b border-transparent hover:border-white pb-1 font-sans">GitHub</a>
                  <a href="https://j-j-j-github.github.io/MY-PORTFOLIO/" target="_blank" rel="noreferrer" className="text-stone-600 hover:text-white transition-all text-[10px] uppercase tracking-widest border-b border-transparent hover:border-white pb-1 font-sans">Portfolio</a>
                  <a href="https://www.linkedin.com/in/jeeval-jolly-jacob-5a28b4329/" target="_blank" rel="noreferrer" className="text-stone-600 hover:text-white transition-all text-[10px] uppercase tracking-widest border-b border-transparent hover:border-white pb-1 font-sans">LinkedIn</a>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-12 left-12 opacity-50 hidden md:block pointer-events-none text-[8px] uppercase tracking-[1em] vertical-text text-stone-500 font-sans">Navigate the silence</div>
      <div className="fixed bottom-12 right-12 opacity-50 hidden md:block pointer-events-none text-[8px] uppercase tracking-[1em] vertical-text text-stone-500 font-sans">By JJJ</div>
    </div>
  )
}

export default App