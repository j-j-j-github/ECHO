import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabaseClient'

// Signature Console Log
console.log("%c ECHO %c Created by Jeeval Jolly J", "color: white; background: #000; padding: 5px; font-weight: bold;", "color: grey;");

// --- HELPER: GET OR CREATE ANONYMOUS DEVICE SIGNATURE ---
const getSignature = () => {
  let sig = localStorage.getItem('echo_signature');
  if (!sig) {
    sig = crypto.randomUUID();
    localStorage.setItem('echo_signature', sig);
  }
  return sig;
};

// --- TIMER HELPER ---
const CountdownTimer = ({ createdAt }) => {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const calculateTime = () => {
      const expiryTime = new Date(createdAt).getTime() + (48 * 60 * 60 * 1000);
      const now = new Date().getTime();
      const difference = expiryTime - now;
      if (difference <= 0) { setTimeLeft("00h 00m 00s"); return; }
      const h = Math.floor(difference / 3600000);
      const m = Math.floor((difference % 3600000) / 60000);
      const s = Math.floor((difference % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`);
    };
    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);
  return <span>{timeLeft}</span>;
};

function App() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [text, setText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [echoes, setEchoes] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Use a stable signature
  const signature = useMemo(() => getSignature(), []);

  useEffect(() => {
    fetchEchoes();
    fetchNotifications();
    
    // Polling for new whispers every 20 seconds
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [signature]);

  async function fetchEchoes() {
    const limit = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase.from('echoes').select('*, replies(*)').gt('created_at', limit).order('created_at', { ascending: false });
    if (data) setEchoes(data);
  }

  async function fetchNotifications() {
    if (!signature) return;

    const { data, error } = await supabase
      .from('replies')
      .select(`
        id, 
        content, 
        created_at, 
        is_read, 
        echoes!inner(signature_id, content)
      `)
      .eq('echoes.signature_id', signature)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (!error && data) {
      setNotifications(data);
    }
  }

  const openNotifications = async () => {
    setIsNotifOpen(true);
    const unreadIds = notifications.filter(n => n.is_read === false).map(n => n.id);
    
    if (unreadIds.length > 0) {
      setNotifications(prev => prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: true } : n));

      await supabase
        .from('replies')
        .update({ is_read: true })
        .in('id', unreadIds);
      
      fetchNotifications();
    }
  };

  const handleRelease = async () => {
    if (!text.trim()) return;
    const { error } = await supabase.from('echoes').insert([{ content: text, signature_id: signature }]);
    if (!error) { 
      setText(""); 
      setIsPosting(false); // Closes the post overlay
      fetchEchoes(); 
    }
  };

  const handleSendReply = async (echoId) => {
    if (!replyText.trim()) return;
    const { error } = await supabase.from('replies').insert([{ echo_id: echoId, content: replyText }]);
    if (!error) { 
      setReplyText(""); 
      setReplyingTo(null); 
      fetchEchoes(); 
      fetchNotifications(); 
    }
  };

  const hasUnread = notifications.some(n => n.is_read === false);

  return (
    <div className="bg-[#050505] text-white font-serif h-screen w-screen overflow-hidden relative selection:bg-stone-800">
      
      {/* --- HEADER --- */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-start px-8 pt-6 md:pt-8">
        <div className="w-10"></div> 
        <button onClick={() => setIsAboutOpen(!isAboutOpen)} className="group flex flex-col items-center focus:outline-none">
          <motion.h1 animate={{ tracking: isAboutOpen ? "0.8em" : "0.6em" }} className="text-2xl md:text-3xl uppercase font-extralight text-stone-100 transition-all duration-700">ECHO</motion.h1>
          <span className="text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-stone-400 mt-2 opacity-80 group-hover:text-white group-hover:tracking-[0.4em] transition-all duration-500 font-sans">
            Click to explore
          </span>
          <motion.div animate={{ width: isAboutOpen ? "80px" : "40px" }} className="h-[1px] bg-stone-600 mt-4 shadow-[0_0_8px_rgba(255,255,255,0.1)]"></motion.div>
        </button>

        {/* --- ORB --- */}
        <button onClick={openNotifications} className="relative p-4 flex items-center justify-center group focus:outline-none">
          <div className="relative flex items-center justify-center">
            <AnimatePresence>
              {hasUnread && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 2.2, 1] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute rounded-full blur-3xl bg-white"
                  style={{ width: '80px', height: '80px' }}
                />
              )}
            </AnimatePresence>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="relative z-10">
              <circle cx="12" cy="12" r="11" stroke={hasUnread ? "white" : "#222"} strokeWidth="0.3" className="transition-colors duration-1000" />
              <motion.circle
                cx="12" cy="12"
                r={hasUnread ? 8 : 4}
                fill={hasUnread ? "white" : "#333"}
                animate={hasUnread ? { opacity: [0.8, 1, 0.8], scale: [1, 1.1, 1] } : { opacity: 0.15, scale: 1 }}
                transition={{ duration: 2, repeat: Infinity }}
                className="transition-all duration-1000"
              />
            </svg>
            {hasUnread && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1.5 }} className="absolute top-0 right-0 w-3 h-3 bg-white rounded-full shadow-[0_0_25px_#fff] z-20 animate-pulse" />
            )}
          </div>
        </button>
      </header>

      {/* --- NOTIFICATION SIDEBAR --- */}
      <AnimatePresence>
        {isNotifOpen && (
          <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} className="fixed right-0 top-0 h-full w-80 bg-[#0a0a0a]/98 backdrop-blur-3xl z-[70] p-8 border-l border-stone-900 shadow-2xl">
             <div className="flex justify-between items-center mb-12 text-left">
                <h2 className="text-[10px] uppercase tracking-[0.5em] text-stone-500 font-sans">The Secret Log</h2>
                <button onClick={() => setIsNotifOpen(false)} className="text-2xl font-light hover:rotate-90 transition-transform">×</button>
             </div>
             <div className="space-y-8 overflow-y-auto h-[80vh] no-scrollbar text-left">
                {notifications.length > 0 ? (
                  notifications.map(n => (
                    <div key={n.id} className="border-b border-stone-900 pb-6 relative group">
                      {!n.is_read && <span className="absolute -left-3 top-1 w-1 h-1 bg-white rounded-full" />}
                      <p className="text-[9px] text-stone-600 mb-2 uppercase tracking-widest italic truncate">Echo: "{n.echoes?.content}"</p>
                      <p className="text-stone-200 text-sm italic font-light leading-relaxed">"{n.content}"</p>
                    </div>
                  ))
                ) : (
                  <p className="text-stone-700 italic text-sm text-center mt-20">Silence follows your whispers.</p>
                )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- SIDE NAV (+) --- */}
      <nav className="fixed right-8 top-1/2 -translate-y-1/2 z-50">
        <button onClick={() => setIsPosting(true)} className="w-14 h-14 rounded-full border border-stone-800 flex items-center justify-center bg-white/5 hover:border-stone-400 hover:bg-white/10 transition-all group shadow-2xl">
          <span className="text-2xl font-light text-stone-400 group-hover:text-white transition-colors">+</span>
        </button>
      </nav>

      {/* --- MAIN FEED --- */}
      <main className="snap-container no-scrollbar h-full w-full relative z-10">
        {echoes.length > 0 ? (
          echoes.map((echo) => (
            <section key={echo.id} className="snap-section px-12 flex flex-col items-center justify-center relative">
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="max-w-4xl text-center">
                <p className="text-3xl md:text-6xl leading-tight font-light italic text-white mb-16 px-4">"{echo.content}"</p>
                <div className="flex flex-col items-center gap-8">
                  <div className="flex items-center justify-center gap-4 opacity-30">
                    <div className="h-[1px] w-8 bg-stone-500"></div>
                    <span className="text-[10px] uppercase tracking-[0.6em] font-sans text-stone-100">
                      <CountdownTimer createdAt={echo.created_at} />
                    </span>
                    <div className="h-[1px] w-8 bg-stone-500"></div>
                  </div>
                  <button 
                    onClick={() => setReplyingTo(echo.id)} 
                    className="px-10 py-3 rounded-full border border-stone-800 bg-stone-900/40 text-[10px] uppercase tracking-[0.4em] text-stone-400 hover:text-white hover:border-stone-400 transition-all duration-500 shadow-lg"
                  >
                    Reply Anonymously
                  </button>
                </div>
                <div className="mt-20 space-y-6 max-h-[25vh] overflow-y-auto no-scrollbar px-4">
                  {echo.replies?.map(r => (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={r.id} className="text-stone-500 text-lg italic font-extralight tracking-wide">
                      {r.content}
                    </motion.p>
                  ))}
                </div>
              </motion.div>

              <AnimatePresence>
                {replyingTo === echo.id && (
                  <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-md px-6 z-50">
                    <div className="bg-[#0f0f0f] border border-stone-800 p-8 rounded-[2rem] shadow-2xl">
                      <textarea autoFocus value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type a whisper..." className="w-full bg-transparent border-none text-xl outline-none italic h-24 resize-none text-white text-center" />
                      <div className="flex justify-center gap-8 mt-4">
                        <button onClick={() => setReplyingTo(null)} className="text-[10px] uppercase text-stone-600 tracking-widest hover:text-stone-400">Cancel</button>
                        <button onClick={() => handleSendReply(echo.id)} className="text-[10px] uppercase underline tracking-[0.3em] font-bold text-white">Send</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          ))
        ) : (
          <section className="snap-section flex items-center justify-center">
             <p className="text-stone-600 italic tracking-[0.5em] uppercase text-[10px]">The void is empty.</p>
          </section>
        )}
      </main>

      {/* --- OVERLAYS --- */}
      <AnimatePresence>
        {/* ABOUT OVERLAY */}
        {isAboutOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center"
            onClick={() => setIsAboutOpen(false)}
          >
            <div className="max-w-xl flex flex-col items-center">
              <p className="text-2xl italic font-extralight text-stone-300 leading-relaxed mb-10">
                "A fleeting space for the things we carry. No accounts, no history, no judgment. Every thought fades after 48 hours."
              </p>
              <p className="text-[10px] uppercase tracking-[0.8em] text-stone-600 font-sans mb-20">
                48H Lifecycle • No Identity • Pure Echo
              </p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="pt-12 border-t border-stone-900 w-full"
                onClick={(e) => e.stopPropagation()} 
              >
                <p className="text-[10px] uppercase tracking-[0.4em] text-stone-700 mb-6 font-sans">Architect of ECHO</p>
                <h3 className="text-xl font-light tracking-widest text-stone-200 mb-4">J•J•J</h3>
                <div className="flex gap-8 justify-center items-center">
                  <a href="https://github.com/j-j-j-github" target="_blank" rel="noreferrer" className="text-stone-600 hover:text-white transition-colors duration-500 text-[10px] uppercase tracking-widest border-b border-transparent hover:border-white pb-1">GitHub</a>
                  <a href="https://j-j-j-github.github.io/MY-PORTFOLIO/" target="_blank" rel="noreferrer" className="text-stone-600 hover:text-white transition-colors duration-500 text-[10px] uppercase tracking-widest border-b border-transparent hover:border-white pb-1">Portfolio</a>
                  <a href="https://www.linkedin.com/in/jeeval-jolly-jacob-5a28b4329/" target="_blank" rel="noreferrer" className="text-stone-600 hover:text-white transition-colors duration-500 text-[10px] uppercase tracking-widest border-b border-transparent hover:border-white pb-1">LinkedIn</a>

                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* POST OVERLAY */}
        {isPosting && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-8"
          >
            <div className="max-w-xl w-full text-center">
              <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Whisper into the void..." className="w-full bg-transparent border-none text-4xl text-center outline-none italic font-light min-h-[300px] text-white px-4" maxLength={280} />
              <div className="flex justify-center gap-12 mt-12">
                <button onClick={() => setIsPosting(false)} className="text-[10px] uppercase text-stone-700 tracking-[0.4em] hover:text-stone-400">Cancel</button>
                <button onClick={handleRelease} className="px-14 py-4 rounded-full border border-stone-800 text-[10px] uppercase tracking-[0.6em] hover:bg-white hover:text-black transition-all shadow-xl">Release</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-12 left-12 opacity-20 hidden md:block">
        <p className="text-[8px] uppercase tracking-[1em] vertical-text text-stone-500">Navigate the silence</p>
      </div>
    </div>
  )
}

export default App