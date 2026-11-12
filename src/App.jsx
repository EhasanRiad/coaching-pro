import React, { useEffect, useState } from 'react'
import { useStore, hydrateCloud, clearState } from './store.js'
import { cloud, auth, sb } from './db.js'
import { Dashboard, Students, Batches, Teachers, Attendance, Fees, Exams, Notices, Settings } from './pages.jsx'

const NAV = [
  ['dashboard', '🏠', 'ড্যাশবোর্ড', Dashboard],
  ['students', '🎓', 'শিক্ষার্থী', Students],
  ['attendance', '✅', 'উপস্থিতি', Attendance],
  ['fees', '💰', 'বেতন', Fees],
  ['exams', '📝', 'পরীক্ষা', Exams],
  ['batches', '📚', 'ব্যাচ', Batches],
  ['teachers', '👨‍🏫', 'শিক্ষক', Teachers],
  ['notices', '📢', 'নোটিশ', Notices],
  ['settings', '⚙️', 'সেটিংস', Settings],
]

function Login({ onDemo }) {
  const [mode, setMode] = useState('in')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [cname, setCname] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      if (mode === 'in') await auth.signIn(email, pass)
      else { const has = await auth.signUp(email, pass, cname); if (!has) setErr('ইমেইল ভেরিফিকেশন চালু আছে — ইনবক্স চেক করে তারপর লগইন করুন।') }
    } catch (x) { setErr(x.message === 'Invalid login credentials' ? 'ইমেইল বা পাসওয়ার্ড ভুল' : x.message) }
    setBusy(false)
  }
  return (
    <div className="login">
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <img src="./icon.svg" width="64" height="64" alt="" style={{ borderRadius: 16 }} />
          <h1 style={{ marginTop: 8 }}>কোচিং প্রো</h1><div className="sub">আপনার কোচিংয়ের সম্পূর্ণ ম্যানেজমেন্ট সিস্টেম</div>
        </div>
        {cloud ? (
          <form onSubmit={submit}>
            {mode === 'up' && <div className="field"><label>কোচিংয়ের নাম</label><input className="in" required value={cname} onChange={(e) => setCname(e.target.value)} /></div>}
            <div className="field"><label>ইমেইল</label><input className="in" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="field"><label>পাসওয়ার্ড</label><input className="in" type="password" required minLength={6} value={pass} onChange={(e) => setPass(e.target.value)} /></div>
            {err && <div className="tag t-bad" style={{ marginBottom: 10, display: 'block' }}>{err}</div>}
            <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? '...' : mode === 'in' ? 'লগইন' : 'নতুন কোচিং খুলুন'}</button>
            <p className="sub" style={{ textAlign: 'center', marginTop: 12, cursor: 'pointer' }} onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr('') }}>{mode === 'in' ? 'নতুন? অ্যাকাউন্ট খুলুন' : 'অ্যাকাউন্ট আছে? লগইন করুন'}</p>
          </form>
        ) : (
          <>
            <div className="demo">🧪 ডেমো মোড — নমুনা ডেটা দিয়ে সব ফিচার চালিয়ে দেখুন। আপনার পরিবর্তন শুধু এই ডিভাইসে থাকবে।</div>
            <button className="btn" style={{ width: '100%' }} onClick={onDemo}>ডেমো দেখুন →</button>
          </>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const s = useStore()
  const [stage, setStage] = useState(cloud ? 'boot' : 'login') // boot | login | loading | ready | error
  const [page, setPage] = useState('dashboard')
  const [toast, setToast] = useState('')

  useEffect(() => {
    const h = (e) => { setToast('ডেটাবেজ ত্রুটি: ' + e.detail); setTimeout(() => setToast(''), 5000) }
    window.addEventListener('db-error', h)
    return () => window.removeEventListener('db-error', h)
  }, [])

  const enter = async () => {
    setStage('loading')
    try { await hydrateCloud(); setStage('ready') } catch (e) { setToast(e.message); setStage('error') }
  }
  useEffect(() => {
    if (!cloud) return
    auth.session().then((ses) => (ses ? enter() : setStage('login')))
    const { data } = sb.auth.onAuthStateChange((ev, ses) => { if (ev === 'SIGNED_IN' && ses) enter(); if (ev === 'SIGNED_OUT') { clearState(); setStage('login') } })
    return () => data.subscription.unsubscribe()
  }, [])

  const logout = async () => { if (cloud) await auth.signOut(); else setStage('login'); setPage('dashboard') }

  if (stage === 'boot' || stage === 'loading') return <div className="login"><div className="card" style={{ textAlign: 'center' }}>⏳ লোড হচ্ছে...</div></div>
  if (stage === 'error') return <div className="login"><div className="card"><h2>সংযোগে সমস্যা</h2><p className="sub" style={{ margin: '8px 0 14px' }}>{toast}</p><button className="btn" onClick={logout}>আবার চেষ্টা করুন</button></div></div>
  if (stage === 'login') return <Login onDemo={() => setStage('ready')} />

  const Cur = NAV.find((n) => n[0] === page)
  const Page = Cur[3]
  return (
    <div className="app">
      <aside className="side">
        <div className="brand"><img src="./icon.svg" alt="" /><div>কোচিং প্রো<small>{s.settings.name}</small></div></div>
        {NAV.map(([k, i, l]) => <button key={k} className={`nav ${page === k ? 'on' : ''}`} onClick={() => setPage(k)}><span className="i">{i}</span>{l}</button>)}
      </aside>
      <main className="main">
        <div className="top noprint"><div><h1>{Cur[1]} {Cur[2]}</h1><div className="sub">{s.settings.name}</div></div>{!cloud && <span className="tag t-warn">ডেমো মোড</span>}</div>
        <Page s={s} go={setPage} onLogout={logout} />
      </main>
      <nav className="bottom noprint">{NAV.slice(0, 5).map(([k, i, l]) => <button key={k} className={page === k ? 'on' : ''} onClick={() => setPage(k)}><span>{i}</span>{l}</button>)}
        <button className={['batches', 'teachers', 'notices', 'settings'].includes(page) ? 'on' : ''} onClick={() => setPage(['batches', 'teachers', 'notices', 'settings'][(['batches', 'teachers', 'notices', 'settings'].indexOf(page) + 1) % 4])}><span>☰</span>আরও</button></nav>
      {toast && <div style={{ position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)', background: '#991b1b', color: '#fff', padding: '10px 16px', borderRadius: 12, zIndex: 99 }}>{toast}</div>}
    </div>
  )
}
