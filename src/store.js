import { useEffect, useState } from 'react'
import { cloud, fetchAll, saveItem, deleteItem, saveAttendance, saveMarks, saveSettings } from './db.js'

const KEY = 'coaching-pro-v1'
export const MONTHS = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর']
const BN = '০১২৩৪৫৬৭৮৯'
export const bn = (n) => String(n).replace(/\d/g, (d) => BN[d])
export const money = (n) => '৳' + bn(Math.round(n).toLocaleString('en-IN'))
export const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
export const monthLabel = (k) => { const [y, m] = k.split('-'); return `${MONTHS[+m - 1]} ${bn(y)}` }
export const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11) + Date.now().toString(36))

export function grade(pct) {
  if (pct >= 80) return { g: 'A+', c: '#16a34a' }
  if (pct >= 70) return { g: 'A', c: '#22c55e' }
  if (pct >= 60) return { g: 'A-', c: '#65a30d' }
  if (pct >= 50) return { g: 'B', c: '#ca8a04' }
  if (pct >= 40) return { g: 'C', c: '#ea580c' }
  if (pct >= 33) return { g: 'D', c: '#dc2626' }
  return { g: 'F', c: '#991b1b' }
}

function seed() {
  const now = new Date()
  const teachers = [
    { id: 't1', name: 'মাহমুদ হাসান', subject: 'গণিত', phone: '01711000001', salary: 15000 },
    { id: 't2', name: 'সাবিনা ইয়াসমিন', subject: 'ইংরেজি', phone: '01711000002', salary: 14000 },
    { id: 't3', name: 'রফিকুল ইসলাম', subject: 'পদার্থবিজ্ঞান', phone: '01711000003', salary: 16000 },
    { id: 't4', name: 'নাজমা আক্তার', subject: 'রসায়ন', phone: '01711000004', salary: 15000 },
  ]
  const batches = [
    { id: 'b1', name: 'নবম-দশম গণিত (সকাল)', cls: 'নবম-দশম', teacherId: 't1', schedule: 'শনি, সোম, বুধ — ৮:০০ AM', fee: 800 },
    { id: 'b2', name: 'ইংরেজি স্পোকেন', cls: 'অষ্টম-দশম', teacherId: 't2', schedule: 'রবি, মঙ্গল — ৪:০০ PM', fee: 600 },
    { id: 'b3', name: 'একাদশ পদার্থবিজ্ঞান', cls: 'একাদশ', teacherId: 't3', schedule: 'শনি, মঙ্গল, বৃহস্পতি — ৫:০০ PM', fee: 1000 },
    { id: 'b4', name: 'একাদশ রসায়ন', cls: 'একাদশ', teacherId: 't4', schedule: 'রবি, বুধ — ৬:০০ PM', fee: 1000 },
  ]
  const names = ['আরিফ হোসেন','তানভীর আহমেদ','সুমাইয়া আক্তার','ফারহান ইসলাম','নুসরাত জাহান','রাকিব হাসান','মিম আক্তার','সাকিব আল হাসান','তাসনিম রহমান','ইমরান খান','জান্নাতুল ফেরদৌস','শাহরিয়ার কবির','রুমানা পারভীন','আবির দাস','লামিয়া সুলতানা','মেহেদী হাসান','ফাহিম রেজা','অনন্যা চৌধুরী','নাঈম উদ্দিন','সুমন মিয়া','তামান্না ইয়াসমিন','রিয়াদ হোসেন','সাদিয়া ইসলাম','জুবায়ের আহমেদ']
  const students = names.map((name, i) => {
    const b = batches[i % 4]
    return { id: 's' + (i + 1), name, roll: i + 1, batchId: b.id, phone: '0181' + String(1000000 + i * 137).slice(0, 7), guardian: 'অভিভাবক — ' + name.split(' ')[1], fee: b.fee, joined: dateKey(new Date(now.getFullYear(), now.getMonth() - 4, 5)) }
  })
  const payments = []
  const cur = monthKey(now)
  for (let back = 1; back <= 3; back++) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1)
    students.forEach((s, i) => { if ((i * 7 + back) % 9 !== 0) payments.push({ id: uid(), studentId: s.id, month: monthKey(d), amount: s.fee, date: dateKey(new Date(d.getFullYear(), d.getMonth(), 5 + (i % 10))) }) })
  }
  students.forEach((s, i) => { if (i % 3 !== 0) payments.push({ id: uid(), studentId: s.id, month: cur, amount: s.fee, date: dateKey(new Date(now.getFullYear(), now.getMonth(), Math.max(1, Math.min(now.getDate(), 2 + (i % 8))))) }) })
  const attendance = {}
  for (let back = 1; back <= 6; back++) {
    const d = new Date(now); d.setDate(d.getDate() - back)
    const k = dateKey(d); attendance[k] = {}
    students.forEach((s, i) => { attendance[k][s.id] = (i * 3 + back * 5) % 11 === 0 ? 'A' : (i + back) % 13 === 0 ? 'L' : 'P' })
  }
  const exams = [
    { id: 'e1', name: 'মাসিক পরীক্ষা — অক্টোবর', batchId: 'b1', date: dateKey(new Date(now.getFullYear(), now.getMonth() - 1, 20)), total: 50, marks: {} },
    { id: 'e2', name: 'মডেল টেস্ট ১', batchId: 'b3', date: dateKey(new Date(now.getFullYear(), now.getMonth() - 1, 25)), total: 100, marks: {} },
  ]
  students.forEach((s, i) => {
    if (s.batchId === 'b1') exams[0].marks[s.id] = 22 + ((i * 7) % 28)
    if (s.batchId === 'b3') exams[1].marks[s.id] = 38 + ((i * 11) % 60)
  })
  const notices = [
    { id: 'n1', title: 'নভেম্বর মাসের বেতন পরিশোধের নির্দেশনা', body: 'সকল শিক্ষার্থীকে ১০ নভেম্বরের মধ্যে মাসিক বেতন পরিশোধ করার জন্য অনুরোধ করা হলো।', date: dateKey(new Date(now.getFullYear(), now.getMonth(), 1)) },
    { id: 'n2', title: 'মডেল টেস্ট ২ — প্রস্তুতি নিন', body: 'আগামী মাসের প্রথম সপ্তাহে একাদশ শ্রেণির মডেল টেস্ট অনুষ্ঠিত হবে।', date: dateKey(new Date(now.getFullYear(), now.getMonth(), 8)) },
  ]
  return { settings: { name: 'সাফল্য কোচিং সেন্টার', phone: '01700-000000', address: 'ধানমন্ডি, ঢাকা' }, teachers, batches, students, payments, attendance, exams, notices }
}

let state = null
const subs = new Set()
function load() {
  if (state) return state
  if (cloud) { state = { settings: { name: '', phone: '', address: '' }, teachers: [], batches: [], students: [], payments: [], attendance: {}, exams: [], notices: [] }; return state }
  try { state = JSON.parse(localStorage.getItem(KEY)) } catch { state = null }
  if (!state) state = seed()
  return state
}
export function setState(fn) {
  state = fn(load())
  if (!cloud) { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {} }
  subs.forEach((f) => f(state))
}
export function resetDemo() { if (!cloud) setState(() => seed()) }
export async function hydrateCloud() { const d = await fetchAll(); setState(() => d) }
export function clearState() { state = null; subs.forEach((f) => f(load())) }
export function useStore() {
  const [s, set] = useState(load)
  useEffect(() => { subs.add(set); return () => subs.delete(set) }, [])
  return s
}
export const actions = {
  upsert(key, item) {
    const full = { ...item, id: item.id || uid() }
    setState((s) => ({ ...s, [key]: s[key].some((x) => x.id === full.id) ? s[key].map((x) => (x.id === full.id ? { ...x, ...full } : x)) : [...s[key], full] }))
    if (cloud) saveItem(key, full)
    return full
  },
  remove(key, id) { setState((s) => ({ ...s, [key]: s[key].filter((x) => x.id !== id) })); if (cloud) deleteItem(key, id) },
  setAttendance(date, map) { setState((s) => ({ ...s, attendance: { ...s.attendance, [date]: { ...(s.attendance[date] || {}), ...map } } })); if (cloud) saveAttendance(date, map) },
  pay(studentId, month, amount) { const p = { id: uid(), studentId, month, amount, date: dateKey() }; setState((s) => ({ ...s, payments: [...s.payments, p] })); if (cloud) saveItem('payments', p); return p },
  setMarks(examId, marks) { setState((s) => ({ ...s, exams: s.exams.map((e) => (e.id === examId ? { ...e, marks } : e)) })); if (cloud) saveMarks(examId, marks) },
  setSettings(v) { setState((s) => ({ ...s, settings: { ...s.settings, ...v } })); if (cloud) saveSettings(v) },
}
