import React, { useState } from 'react'

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button className="btn ghost sm" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function FormModal({ title, fields, init = {}, onSave, onClose }) {
  const [v, setV] = useState(init)
  const set = (k, x) => setV((p) => ({ ...p, [k]: x }))
  const submit = (e) => {
    e.preventDefault()
    const out = { ...v }
    fields.forEach((f) => { if (f.type === 'number') out[f.k] = Number(out[f.k] || 0) })
    onSave(out)
    onClose()
  }
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit}>
        {fields.map((f) => (
          <div className="field" key={f.k}>
            <label>{f.l}</label>
            {f.type === 'select' ? (
              <select className="in" value={v[f.k] ?? ''} onChange={(e) => set(f.k, e.target.value)} required={f.req}>
                <option value="">— বাছাই করুন —</option>
                {f.opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea className="in" rows={4} value={v[f.k] ?? ''} onChange={(e) => set(f.k, e.target.value)} required={f.req} />
            ) : (
              <input className="in" type={f.type || 'text'} value={v[f.k] ?? ''} onChange={(e) => set(f.k, e.target.value)} required={f.req} inputMode={f.type === 'number' ? 'numeric' : undefined} />
            )}
          </div>
        ))}
        <button className="btn" style={{ width: '100%' }}>সংরক্ষণ করুন</button>
      </form>
    </Modal>
  )
}

export const Avatar = ({ name }) => <div className="av">{(name || '?').trim()[0]}</div>
export const Empty = ({ children }) => <div className="empty">{children}</div>
export const confirmDel = (what) => window.confirm(`"${what}" মুছে ফেলবেন? এটা ফেরানো যাবে না।`)
