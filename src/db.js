// ডেটা অ্যাক্সেস লেয়ার — UI শুধু এই ফাইলের মাধ্যমে Supabase-এর সাথে কথা বলে।
// ব্যাকএন্ড বদলাতে (যেমন MySQL API) চাইলে শুধু এই ফাইলটা পাল্টালেই হবে।
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const sb = url && key ? createClient(url, key) : null
export const cloud = !!sb

let orgId = null
const fail = (e) => { console.error(e); window.dispatchEvent(new CustomEvent('db-error', { detail: e?.message || String(e) })) }

const T = {
  teachers: { table: 'teachers', out: (r) => ({ id: r.id, name: r.name, subject: r.subject, phone: r.phone, salary: Number(r.salary) }), in: (r) => ({ id: r.id, name: r.name, subject: r.subject, phone: r.phone, salary: r.salary }) },
  batches: { table: 'batches', out: (r) => ({ id: r.id, name: r.name, cls: r.cls, teacherId: r.teacher_id || '', schedule: r.schedule, fee: Number(r.fee) }), in: (r) => ({ id: r.id, name: r.name, cls: r.cls, teacher_id: r.teacherId || null, schedule: r.schedule, fee: r.fee }) },
  students: { table: 'students', out: (r) => ({ id: r.id, name: r.name, roll: r.roll, batchId: r.batch_id || '', phone: r.phone, guardian: r.guardian, fee: Number(r.fee), joined: r.joined }), in: (r) => ({ id: r.id, name: r.name, roll: r.roll, batch_id: r.batchId || null, phone: r.phone, guardian: r.guardian, fee: r.fee, joined: r.joined }) },
  payments: { table: 'payments', out: (r) => ({ id: r.id, studentId: r.student_id, month: r.month, amount: Number(r.amount), date: r.paid_on }), in: (r) => ({ id: r.id, student_id: r.studentId, month: r.month, amount: r.amount, paid_on: r.date }) },
  exams: { table: 'exams', out: (r) => ({ id: r.id, name: r.name, batchId: r.batch_id || '', date: r.day, total: Number(r.total), marks: {} }), in: (r) => ({ id: r.id, name: r.name, batch_id: r.batchId || null, day: r.date, total: r.total }) },
  notices: { table: 'notices', out: (r) => ({ id: r.id, title: r.title, body: r.body, date: r.day }), in: (r) => ({ id: r.id, title: r.title, body: r.body, day: r.date }) },
}

export const auth = {
  async session() { const { data } = await sb.auth.getSession(); return data.session },
  async signIn(email, password) { const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error },
  async signUp(email, password, coachingName) { const { data, error } = await sb.auth.signUp({ email, password, options: { data: { coaching_name: coachingName } } }); if (error) throw error; return !!data.session },
  async signOut() { await sb.auth.signOut() },
}

export async function fetchAll() {
  const { data: prof, error: pe } = await sb.from('profiles').select('org_id').maybeSingle()
  if (pe || !prof) throw new Error('প্রোফাইল পাওয়া যায়নি — SQL স্কিমা চালানো হয়েছে কি?')
  orgId = prof.org_id
  const q = (t) => sb.from(t).select('*').limit(10000)
  const [org, teachers, batches, students, payments, att, exams, marks, notices] = await Promise.all([
    sb.from('orgs').select('*').eq('id', orgId).single(), q('teachers'), q('batches'), q('students'), q('payments'), q('attendance'), q('exams'), q('exam_marks'), q('notices'),
  ])
  for (const r of [org, teachers, batches, students, payments, att, exams, marks, notices]) if (r.error) throw r.error
  const attendance = {}
  att.data.forEach((a) => { (attendance[a.day] ||= {})[a.student_id] = a.status })
  const examList = exams.data.map(T.exams.out)
  marks.data.forEach((m) => { const e = examList.find((x) => x.id === m.exam_id); if (e) e.marks[m.student_id] = Number(m.marks) })
  return {
    settings: { name: org.data.name, phone: org.data.phone, address: org.data.address },
    teachers: teachers.data.map(T.teachers.out), batches: batches.data.map(T.batches.out), students: students.data.map(T.students.out),
    payments: payments.data.map(T.payments.out), attendance, exams: examList, notices: notices.data.map(T.notices.out),
  }
}

export async function saveItem(key, item) {
  const { error } = await sb.from(T[key].table).upsert({ ...T[key].in(item), org_id: orgId }); if (error) fail(error)
}
export async function deleteItem(key, id) {
  const { error } = await sb.from(T[key].table).delete().eq('id', id); if (error) fail(error)
}
export async function saveAttendance(day, map) {
  const rows = Object.entries(map).map(([student_id, status]) => ({ org_id: orgId, student_id, day, status }))
  if (!rows.length) return
  const { error } = await sb.from('attendance').upsert(rows); if (error) fail(error)
}
export async function saveMarks(examId, marks) {
  const rows = Object.entries(marks).filter(([, v]) => v !== '' && v != null).map(([student_id, v]) => ({ org_id: orgId, exam_id: examId, student_id, marks: Number(v) }))
  const del = await sb.from('exam_marks').delete().eq('exam_id', examId); if (del.error) return fail(del.error)
  if (rows.length) { const { error } = await sb.from('exam_marks').insert(rows); if (error) fail(error) }
}
export async function saveSettings(v) {
  const { error } = await sb.from('orgs').update(v).eq('id', orgId); if (error) fail(error)
}
