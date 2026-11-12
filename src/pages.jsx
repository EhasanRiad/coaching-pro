import React, { useMemo, useState } from 'react'
import { actions, bn, money, monthKey, monthLabel, dateKey, grade, MONTHS, resetDemo } from './store.js'
import { cloud } from './db.js'
import { Modal, FormModal, Avatar, Empty, confirmDel } from './ui.jsx'

const batchName = (s, id) => s.batches.find((b) => b.id === id)?.name || '—'
const lastMonths = (n) => Array.from({ length: n }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - (n - 1 - i)); return monthKey(d) })
const paidMap = (s, m) => { const o = {}; s.payments.filter((p) => p.month === m).forEach((p) => { o[p.studentId] = (o[p.studentId] || 0) + p.amount }); return o }

/* ───────── ড্যাশবোর্ড ───────── */
export function Dashboard({ s, go }) {
  const cur = monthKey()
  const paid = paidMap(s, cur)
  const collected = Object.values(paid).reduce((a, b) => a + b, 0)
  const dueList = s.students.filter((x) => (paid[x.id] || 0) < x.fee)
  const dueAmt = dueList.reduce((a, x) => a + (x.fee - (paid[x.id] || 0)), 0)
  const today = s.attendance[dateKey()]
  const lastDay = Object.keys(s.attendance).sort().pop()
  const att = s.attendance[lastDay] || {}
  const vals = Object.values(att)
  const pct = vals.length ? Math.round((vals.filter((v) => v !== 'A').length / vals.length) * 100) : 0
  const months = lastMonths(6)
  const series = months.map((m) => s.payments.filter((p) => p.month === m).reduce((a, p) => a + p.amount, 0))
  const max = Math.max(...series, 1)
  const stats = [
    ['🎓', 'মোট শিক্ষার্থী', bn(s.students.length), '#e0e7ff'],
    ['📚', 'ব্যাচ', bn(s.batches.length), '#fce7f3'],
    ['💰', 'এ মাসে আদায়', money(collected), '#dcfce7'],
    ['⏳', 'বকেয়া', money(dueAmt), '#fee2e2'],
  ]
  return (
    <>
      <div className="grid g4">
        {stats.map(([i, l, v, c]) => (
          <div className="card stat" key={l}><div className="ic" style={{ background: c }}>{i}</div><div><b>{v}</b><span className="sub">{l}</span></div></div>
        ))}
      </div>
      <div className="grid g2" style={{ marginTop: 14 }}>
        <div className="card">
          <h2>মাসিক আদায় (শেষ ৬ মাস)</h2>
          <div className="chart">{series.map((v, i) => <div key={i}><span>{v ? money(v).replace('৳', '') : ''}</span><i style={{ height: (v / max) * 100 + '%' }} /><span>{MONTHS[+months[i].split('-')[1] - 1].slice(0, 6)}</span></div>)}</div>
        </div>
        <div className="card">
          <h2>উপস্থিতি {lastDay ? `(${bn(lastDay)})` : ''}</h2>
          <div className="row" style={{ marginBottom: 8 }}><b style={{ fontSize: 30 }}>{bn(pct)}%</b><span className="sub">শিক্ষার্থী উপস্থিত ছিল</span></div>
          <div className="bar"><i style={{ width: pct + '%' }} /></div>
          <div className="row" style={{ marginTop: 14 }}><button className="btn sm" onClick={() => go('attendance')}>উপস্থিতি নিন</button>{!today && <span className="tag t-warn">আজকের উপস্থিতি বাকি</span>}</div>
        </div>
      </div>
      <div className="grid g2" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}><h2>বকেয়া তালিকা</h2><button className="btn ghost sm" onClick={() => go('fees')}>সব দেখুন</button></div>
          {!dueList.length ? <Empty>🎉 এ মাসে কোনো বকেয়া নেই</Empty> : dueList.slice(0, 6).map((x) => (
            <div className="row" key={x.id} style={{ padding: '7px 0', borderBottom: '1px solid #f1f2f6' }}><Avatar name={x.name} /><div className="grow"><b>{x.name}</b><div className="sub">{batchName(s, x.batchId)}</div></div><span className="tag t-bad">{money(x.fee - (paid[x.id] || 0))}</span></div>
          ))}
        </div>
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}><h2>নোটিশ</h2><button className="btn ghost sm" onClick={() => go('notices')}>সব দেখুন</button></div>
          {!s.notices.length ? <Empty>কোনো নোটিশ নেই</Empty> : [...s.notices].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).map((n) => (
            <div key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f2f6' }}><b>{n.title}</b><div className="sub">{bn(n.date)}</div></div>
          ))}
        </div>
      </div>
    </>
  )
}

/* ───────── শিক্ষার্থী ───────── */
export function Students({ s }) {
  const [q, setQ] = useState('')
  const [bf, setBf] = useState('')
  const [edit, setEdit] = useState(null)
  const paid = paidMap(s, monthKey())
  const list = s.students.filter((x) => (!bf || x.batchId === bf) && (!q || (x.name + x.phone + x.roll).includes(q))).sort((a, b) => a.roll - b.roll)
  const fields = [
    { k: 'name', l: 'নাম', req: true }, { k: 'roll', l: 'রোল', type: 'number' },
    { k: 'batchId', l: 'ব্যাচ', type: 'select', req: true, opts: s.batches.map((b) => ({ v: b.id, l: b.name })) },
    { k: 'phone', l: 'মোবাইল' }, { k: 'guardian', l: 'অভিভাবকের নাম' }, { k: 'fee', l: 'মাসিক বেতন (৳)', type: 'number' }, { k: 'joined', l: 'ভর্তির তারিখ', type: 'date' },
  ]
  const save = (v) => {
    const b = s.batches.find((x) => x.id === v.batchId)
    actions.upsert('students', { ...v, fee: v.fee || b?.fee || 0, joined: v.joined || dateKey() })
  }
  return (
    <>
      <div className="row noprint" style={{ marginBottom: 14 }}>
        <input className="in grow" placeholder="🔍 নাম / মোবাইল / রোল" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="in grow" value={bf} onChange={(e) => setBf(e.target.value)}><option value="">সব ব্যাচ</option>{s.batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <button className="btn" onClick={() => setEdit({ roll: s.students.length + 1 })}>＋ নতুন ভর্তি</button>
      </div>
      <div className="card tw">
        {!list.length ? <Empty>কোনো শিক্ষার্থী পাওয়া যায়নি</Empty> : (
          <table>
            <thead><tr><th>রোল</th><th>নাম</th><th>ব্যাচ</th><th>মোবাইল</th><th>এ মাসের বেতন</th><th></th></tr></thead>
            <tbody>{list.map((x) => (
              <tr key={x.id}>
                <td>{bn(x.roll)}</td>
                <td><div className="row" style={{ flexWrap: 'nowrap' }}><Avatar name={x.name} /><div><b>{x.name}</b><div className="sub">{x.guardian}</div></div></div></td>
                <td>{batchName(s, x.batchId)}</td><td>{bn(x.phone || '—')}</td>
                <td>{(paid[x.id] || 0) >= x.fee ? <span className="tag t-ok">পরিশোধিত</span> : <span className="tag t-bad">বকেয়া {money(x.fee - (paid[x.id] || 0))}</span>}</td>
                <td style={{ whiteSpace: 'nowrap' }}><button className="btn ghost sm" onClick={() => setEdit(x)}>✎</button> <button className="btn red sm" onClick={() => confirmDel(x.name) && actions.remove('students', x.id)}>🗑</button></td>
              </tr>))}</tbody>
          </table>
        )}
      </div>
      {edit && <FormModal title={edit.id ? 'শিক্ষার্থীর তথ্য সম্পাদনা' : 'নতুন শিক্ষার্থী'} fields={fields} init={edit} onSave={save} onClose={() => setEdit(null)} />}
    </>
  )
}

/* ───────── ব্যাচ ───────── */
export function Batches({ s }) {
  const [edit, setEdit] = useState(null)
  const fields = [
    { k: 'name', l: 'ব্যাচের নাম', req: true }, { k: 'cls', l: 'শ্রেণি' },
    { k: 'teacherId', l: 'শিক্ষক', type: 'select', opts: s.teachers.map((t) => ({ v: t.id, l: `${t.name} (${t.subject})` })) },
    { k: 'schedule', l: 'ক্লাসের সময়সূচি' }, { k: 'fee', l: 'মাসিক বেতন (৳)', type: 'number' },
  ]
  return (
    <>
      <div className="row noprint" style={{ marginBottom: 14, justifyContent: 'flex-end' }}><button className="btn" onClick={() => setEdit({})}>＋ নতুন ব্যাচ</button></div>
      {!s.batches.length ? <div className="card"><Empty>কোনো ব্যাচ নেই</Empty></div> : (
        <div className="grid g2">{s.batches.map((b) => {
          const t = s.teachers.find((x) => x.id === b.teacherId)
          const count = s.students.filter((x) => x.batchId === b.id).length
          return (
            <div className="card" key={b.id}>
              <div className="row" style={{ justifyContent: 'space-between' }}><h2 style={{ margin: 0 }}>{b.name}</h2><span className="tag t-pri">{b.cls}</span></div>
              <div className="sub" style={{ margin: '8px 0' }}>👨‍🏫 {t ? `${t.name} — ${t.subject}` : 'শিক্ষক নির্ধারিত নয়'}<br />🕒 {b.schedule || '—'}</div>
              <div className="row" style={{ justifyContent: 'space-between' }}><span><b>{bn(count)}</b> জন · {money(b.fee)}/মাস</span>
                <span><button className="btn ghost sm" onClick={() => setEdit(b)}>✎</button> <button className="btn red sm" onClick={() => confirmDel(b.name) && actions.remove('batches', b.id)}>🗑</button></span></div>
            </div>)
        })}</div>
      )}
      {edit && <FormModal title={edit.id ? 'ব্যাচ সম্পাদনা' : 'নতুন ব্যাচ'} fields={fields} init={edit} onSave={(v) => actions.upsert('batches', v)} onClose={() => setEdit(null)} />}
    </>
  )
}

/* ───────── শিক্ষক ───────── */
export function Teachers({ s }) {
  const [edit, setEdit] = useState(null)
  const fields = [{ k: 'name', l: 'নাম', req: true }, { k: 'subject', l: 'বিষয়' }, { k: 'phone', l: 'মোবাইল' }, { k: 'salary', l: 'মাসিক বেতন (৳)', type: 'number' }]
  return (
    <>
      <div className="row noprint" style={{ marginBottom: 14, justifyContent: 'flex-end' }}><button className="btn" onClick={() => setEdit({})}>＋ নতুন শিক্ষক</button></div>
      <div className="card tw">{!s.teachers.length ? <Empty>কোনো শিক্ষক নেই</Empty> : (
        <table><thead><tr><th>নাম</th><th>বিষয়</th><th>মোবাইল</th><th>ব্যাচ</th><th>বেতন</th><th></th></tr></thead>
          <tbody>{s.teachers.map((t) => (
            <tr key={t.id}><td><div className="row" style={{ flexWrap: 'nowrap' }}><Avatar name={t.name} /><b>{t.name}</b></div></td><td>{t.subject}</td><td>{bn(t.phone || '—')}</td>
              <td>{bn(s.batches.filter((b) => b.teacherId === t.id).length)} টি</td><td>{money(t.salary)}</td>
              <td style={{ whiteSpace: 'nowrap' }}><button className="btn ghost sm" onClick={() => setEdit(t)}>✎</button> <button className="btn red sm" onClick={() => confirmDel(t.name) && actions.remove('teachers', t.id)}>🗑</button></td></tr>))}</tbody></table>
      )}</div>
      {edit && <FormModal title={edit.id ? 'শিক্ষক সম্পাদনা' : 'নতুন শিক্ষক'} fields={fields} init={edit} onSave={(v) => actions.upsert('teachers', v)} onClose={() => setEdit(null)} />}
    </>
  )
}

/* ───────── উপস্থিতি ───────── */
export function Attendance({ s }) {
  const [batch, setBatch] = useState(s.batches[0]?.id || '')
  const [date, setDate] = useState(dateKey())
  const students = s.students.filter((x) => x.batchId === batch).sort((a, b) => a.roll - b.roll)
  const saved = s.attendance[date] || {}
  const [draft, setDraft] = useState({})
  const [msg, setMsg] = useState('')
  const val = (id) => draft[id] ?? saved[id] ?? ''
  const mark = (id, v) => { setDraft((d) => ({ ...d, [id]: v })); setMsg('') }
  const all = (v) => { const d = {}; students.forEach((x) => (d[x.id] = v)); setDraft(d); setMsg('') }
  const save = () => { const map = {}; students.forEach((x) => { if (val(x.id)) map[x.id] = val(x.id) }); actions.setAttendance(date, map); setDraft({}); setMsg('✓ সংরক্ষিত হয়েছে') }
  const cnt = (k) => students.filter((x) => val(x.id) === k).length
  const monthStats = useMemo(() => students.map((x) => { const pre = Object.entries(s.attendance).filter(([d]) => d.startsWith(date.slice(0, 7))); const days = pre.filter(([, m]) => m[x.id]).length; const p = pre.filter(([, m]) => m[x.id] && m[x.id] !== 'A').length; return { id: x.id, pct: days ? Math.round((p / days) * 100) : null } }), [s.attendance, batch, date, s.students])
  return (
    <>
      <div className="row noprint" style={{ marginBottom: 14 }}>
        <select className="in grow" value={batch} onChange={(e) => { setBatch(e.target.value); setDraft({}) }}>{s.batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <input className="in grow" type="date" value={date} max={dateKey()} onChange={(e) => { setDate(e.target.value); setDraft({}) }} />
      </div>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="row"><span className="tag t-ok">উপস্থিত {bn(cnt('P'))}</span><span className="tag t-bad">অনুপস্থিত {bn(cnt('A'))}</span><span className="tag t-warn">দেরি {bn(cnt('L'))}</span></div>
          <div className="row"><button className="btn green sm" onClick={() => all('P')}>সবাই উপস্থিত</button><button className="btn sm" onClick={save}>সংরক্ষণ</button></div>
        </div>
        {msg && <div className="tag t-ok" style={{ marginBottom: 8 }}>{msg}</div>}
        {!students.length ? <Empty>এই ব্যাচে কোনো শিক্ষার্থী নেই</Empty> : students.map((x) => {
          const ms = monthStats.find((m) => m.id === x.id)?.pct
          return (
            <div className="row" key={x.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f2f6', justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <div className="row" style={{ flexWrap: 'nowrap', minWidth: 0 }}><Avatar name={x.name} /><div style={{ minWidth: 0 }}><b>{bn(x.roll)}. {x.name}</b><div className="sub">এ মাসে {ms == null ? '—' : bn(ms) + '%'}</div></div></div>
              <div className="att">{[['P', 'উ'], ['A', 'অ'], ['L', 'দে']].map(([k, l]) => <button key={k} className={`${k} ${val(x.id) === k ? 'on' : ''}`} onClick={() => mark(x.id, k)}>{l}</button>)}</div>
            </div>)
        })}
      </div>
    </>
  )
}

/* ───────── ফি / বেতন ───────── */
export function Fees({ s }) {
  const months = lastMonths(6).reverse()
  const [m, setM] = useState(months[0])
  const [bf, setBf] = useState('')
  const [pay, setPay] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const paid = paidMap(s, m)
  const list = s.students.filter((x) => !bf || x.batchId === bf).sort((a, b) => a.roll - b.roll)
  const total = list.reduce((a, x) => a + x.fee, 0)
  const got = list.reduce((a, x) => a + Math.min(paid[x.id] || 0, x.fee), 0)
  const doPay = (x, amt) => { const p = actions.pay(x.id, m, amt); setPay(null); setReceipt({ ...p, student: x }) }
  return (
    <>
      <div className="row noprint" style={{ marginBottom: 14 }}>
        <select className="in grow" value={m} onChange={(e) => setM(e.target.value)}>{months.map((k) => <option key={k} value={k}>{monthLabel(k)}</option>)}</select>
        <select className="in grow" value={bf} onChange={(e) => setBf(e.target.value)}><option value="">সব ব্যাচ</option>{s.batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
      </div>
      <div className="grid g3" style={{ marginBottom: 14 }}>
        <div className="card"><span className="sub">প্রাপ্য</span><b style={{ display: 'block', fontSize: 22 }}>{money(total)}</b></div>
        <div className="card"><span className="sub">আদায়</span><b style={{ display: 'block', fontSize: 22, color: 'var(--ok)' }}>{money(got)}</b></div>
        <div className="card"><span className="sub">বকেয়া</span><b style={{ display: 'block', fontSize: 22, color: 'var(--bad)' }}>{money(total - got)}</b></div>
      </div>
      <div className="card tw">
        <table><thead><tr><th>নাম</th><th>ব্যাচ</th><th>বেতন</th><th>পরিশোধ</th><th>অবস্থা</th><th></th></tr></thead>
          <tbody>{list.map((x) => { const p = paid[x.id] || 0; const due = x.fee - p; return (
            <tr key={x.id}><td><b>{x.name}</b></td><td>{batchName(s, x.batchId)}</td><td>{money(x.fee)}</td><td>{money(p)}</td>
              <td>{due <= 0 ? <span className="tag t-ok">পরিশোধিত</span> : p > 0 ? <span className="tag t-warn">আংশিক</span> : <span className="tag t-bad">বকেয়া</span>}</td>
              <td>{due > 0 ? <button className="btn sm" onClick={() => setPay({ x, due })}>আদায়</button> : <button className="btn ghost sm" onClick={() => setReceipt({ month: m, amount: p, date: s.payments.find((q) => q.studentId === x.id && q.month === m)?.date, student: x })}>রসিদ</button>}</td></tr>) })}</tbody></table>
      </div>
      {pay && <PayModal pay={pay} m={m} onClose={() => setPay(null)} onPay={doPay} />}
      {receipt && <Receipt r={receipt} s={s} onClose={() => setReceipt(null)} />}
    </>
  )
}
function PayModal({ pay, m, onClose, onPay }) {
  const [amt, setAmt] = useState(pay.due)
  return (
    <Modal title="বেতন আদায়" onClose={onClose}>
      <p><b>{pay.x.name}</b> — {monthLabel(m)}</p>
      <div className="field" style={{ marginTop: 12 }}><label>পরিমাণ (৳)</label><input className="in" type="number" value={amt} onChange={(e) => setAmt(e.target.value)} /></div>
      <button className="btn" style={{ width: '100%' }} disabled={!(+amt > 0)} onClick={() => onPay(pay.x, +amt)}>আদায় নিশ্চিত করুন</button>
    </Modal>
  )
}
function Receipt({ r, s, onClose }) {
  return (
    <Modal title="পেমেন্ট রসিদ" onClose={onClose}>
      <div style={{ border: '2px dashed #c7d2fe', borderRadius: 14, padding: 16, textAlign: 'center' }}>
        <h2 style={{ margin: 0 }}>{s.settings.name}</h2><div className="sub">{s.settings.address} · {s.settings.phone}</div><hr style={{ margin: '12px 0', border: 0, borderTop: '1px solid #e5e7eb' }} />
        <p style={{ textAlign: 'left', lineHeight: 1.9 }}>শিক্ষার্থী: <b>{r.student.name}</b><br />ব্যাচ: {batchName(s, r.student.batchId)}<br />মাস: {monthLabel(r.month)}<br />তারিখ: {bn(r.date || '')}<br />পরিমাণ: <b style={{ color: 'var(--ok)', fontSize: 20 }}>{money(r.amount)}</b></p>
      </div>
      <button className="btn noprint" style={{ width: '100%', marginTop: 12 }} onClick={() => window.print()}>🖨 প্রিন্ট করুন</button>
    </Modal>
  )
}

/* ───────── পরীক্ষা ───────── */
export function Exams({ s }) {
  const [edit, setEdit] = useState(null)
  const [marks, setMarks] = useState(null)
  const [view, setView] = useState(null)
  const fields = [{ k: 'name', l: 'পরীক্ষার নাম', req: true }, { k: 'batchId', l: 'ব্যাচ', type: 'select', req: true, opts: s.batches.map((b) => ({ v: b.id, l: b.name })) }, { k: 'date', l: 'তারিখ', type: 'date' }, { k: 'total', l: 'পূর্ণমান', type: 'number' }]
  return (
    <>
      <div className="row noprint" style={{ marginBottom: 14, justifyContent: 'flex-end' }}><button className="btn" onClick={() => setEdit({ total: 100, date: dateKey(), marks: {} })}>＋ নতুন পরীক্ষা</button></div>
      {!s.exams.length ? <div className="card"><Empty>কোনো পরীক্ষা নেই</Empty></div> : (
        <div className="grid g2">{[...s.exams].sort((a, b) => b.date.localeCompare(a.date)).map((e) => {
          const n = Object.keys(e.marks || {}).length
          return (
            <div className="card" key={e.id}>
              <h2 style={{ marginBottom: 4 }}>{e.name}</h2>
              <div className="sub">{batchName(s, e.batchId)} · {bn(e.date)} · পূর্ণমান {bn(e.total)}</div>
              <div className="row" style={{ marginTop: 10, justifyContent: 'space-between' }}>
                <span className="tag t-pri">{bn(n)} জনের নম্বর দেওয়া</span>
                <span><button className="btn sm" onClick={() => setMarks(e)}>নম্বর দিন</button> <button className="btn ghost sm" onClick={() => setView(e)}>ফলাফল</button> <button className="btn red sm" onClick={() => confirmDel(e.name) && actions.remove('exams', e.id)}>🗑</button></span>
              </div>
            </div>)
        })}</div>
      )}
      {edit && <FormModal title="নতুন পরীক্ষা" fields={fields} init={edit} onSave={(v) => actions.upsert('exams', { ...v, marks: v.marks || {} })} onClose={() => setEdit(null)} />}
      {marks && <MarksModal s={s} e={marks} onClose={() => setMarks(null)} />}
      {view && <Result s={s} e={s.exams.find((x) => x.id === view.id) || view} onClose={() => setView(null)} />}
    </>
  )
}
function MarksModal({ s, e, onClose }) {
  const students = s.students.filter((x) => x.batchId === e.batchId).sort((a, b) => a.roll - b.roll)
  const [m, setM] = useState({ ...(e.marks || {}) })
  return (
    <Modal title={`নম্বর — ${e.name}`} onClose={onClose}>
      {!students.length ? <Empty>এই ব্যাচে শিক্ষার্থী নেই</Empty> : students.map((x) => (
        <div className="row" key={x.id} style={{ marginBottom: 8, flexWrap: 'nowrap' }}><div className="grow">{bn(x.roll)}. {x.name}</div>
          <input className="in" style={{ width: 90 }} type="number" min="0" max={e.total} value={m[x.id] ?? ''} onChange={(ev) => setM({ ...m, [x.id]: ev.target.value === '' ? '' : Math.min(+ev.target.value, e.total) })} /></div>))}
      <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={() => { const c = {}; Object.entries(m).forEach(([k, v]) => { if (v !== '') c[k] = +v }); actions.setMarks(e.id, c); onClose() }}>সংরক্ষণ</button>
    </Modal>
  )
}
function Result({ s, e, onClose }) {
  const rows = Object.entries(e.marks || {}).map(([id, v]) => ({ st: s.students.find((x) => x.id === id), v })).filter((r) => r.st).sort((a, b) => b.v - a.v)
  return (
    <Modal title={`ফলাফল — ${e.name}`} onClose={onClose}>
      {!rows.length ? <Empty>এখনো কোনো নম্বর দেওয়া হয়নি</Empty> : <div className="tw"><table><thead><tr><th>মেধা</th><th>নাম</th><th>নম্বর</th><th>গ্রেড</th></tr></thead>
        <tbody>{rows.map((r, i) => { const g = grade((r.v / e.total) * 100); return <tr key={r.st.id}><td>{bn(i + 1)}</td><td>{r.st.name}</td><td>{bn(r.v)}/{bn(e.total)}</td><td><b style={{ color: g.c }}>{g.g}</b></td></tr> })}</tbody></table></div>}
      <button className="btn ghost noprint" style={{ width: '100%', marginTop: 10 }} onClick={() => window.print()}>🖨 প্রিন্ট</button>
    </Modal>
  )
}

/* ───────── নোটিশ ───────── */
export function Notices({ s }) {
  const [edit, setEdit] = useState(null)
  const fields = [{ k: 'title', l: 'শিরোনাম', req: true }, { k: 'body', l: 'বিস্তারিত', type: 'textarea' }]
  return (
    <>
      <div className="row noprint" style={{ marginBottom: 14, justifyContent: 'flex-end' }}><button className="btn" onClick={() => setEdit({})}>＋ নতুন নোটিশ</button></div>
      {!s.notices.length ? <div className="card"><Empty>কোনো নোটিশ নেই</Empty></div> : [...s.notices].sort((a, b) => b.date.localeCompare(a.date)).map((n) => (
        <div className="card" key={n.id} style={{ marginBottom: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}><h2 style={{ margin: 0 }}>{n.title}</h2><span className="sub">{bn(n.date)}</span></div>
          <p style={{ margin: '8px 0', whiteSpace: 'pre-wrap' }}>{n.body}</p>
          <button className="btn ghost sm" onClick={() => setEdit(n)}>✎ সম্পাদনা</button> <button className="btn red sm" onClick={() => confirmDel(n.title) && actions.remove('notices', n.id)}>🗑</button>
        </div>))}
      {edit && <FormModal title={edit.id ? 'নোটিশ সম্পাদনা' : 'নতুন নোটিশ'} fields={fields} init={edit} onSave={(v) => actions.upsert('notices', { ...v, date: v.date || dateKey() })} onClose={() => setEdit(null)} />}
    </>
  )
}

/* ───────── সেটিংস ───────── */
export function Settings({ s, onLogout }) {
  const [v, setV] = useState(s.settings)
  const [ok, setOk] = useState(false)
  return (
    <div className="grid g2">
      <div className="card">
        <h2>কোচিংয়ের তথ্য</h2>
        {[['name', 'কোচিংয়ের নাম'], ['phone', 'মোবাইল'], ['address', 'ঠিকানা']].map(([k, l]) => <div className="field" key={k}><label>{l}</label><input className="in" value={v[k] || ''} onChange={(e) => { setV({ ...v, [k]: e.target.value }); setOk(false) }} /></div>)}
        <button className="btn" onClick={() => { actions.setSettings(v); setOk(true) }}>সংরক্ষণ</button> {ok && <span className="tag t-ok">✓ সংরক্ষিত</span>}
      </div>
      <div className="card">
        <h2>সিস্টেম</h2>
        <p className="sub" style={{ marginBottom: 12 }}>ডেটা মোড: {cloud ? '☁️ Supabase (লাইভ ডেটাবেজ)' : '🧪 ডেমো (ব্রাউজারে সংরক্ষিত)'}</p>
        {!cloud && <button className="btn ghost" style={{ marginRight: 8 }} onClick={() => confirm('ডেমো ডেটা রিসেট হবে। নিশ্চিত?') && resetDemo()}>↺ ডেমো ডেটা রিসেট</button>}
        <button className="btn red" onClick={onLogout}>লগআউট</button>
      </div>
    </div>
  )
}
