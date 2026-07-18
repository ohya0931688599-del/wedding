'use client'

import { useState, useEffect } from 'react'
import { addTable, deleteTable, getTables, getQuestions, resetTableChallenge } from '@/app/actions'
import Link from 'next/link'

export default function TablesPage() {
  const [tables, setTables] = useState<any[]>([])
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [origin, setOrigin] = useState('')

  const fetchTables = async () => {
    const data = await getTables()
    const qData = await getQuestions()
    setTables(data)
    setQuestions(qData)
    setLoading(false)
  }

  useEffect(() => {
    fetchTables()
    setOrigin(window.location.origin)
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    // Generate a random token for the table QR code URL
    const token = Math.random().toString(36).substring(2, 10)
    await addTable({
      name: formData.get('name') as string,
      token: token
    })
    form.reset()
    fetchTables()
  }

  return (
    <div className="card animate-fade-in">
      <h2 className="title" style={{ fontSize: '1.8rem' }}>桌次管理</h2>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '3rem', padding: '1.5rem', background: 'rgba(253, 251, 247, 0.02)', borderRadius: '8px', border: '1px solid var(--border-gold)' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--accent-gold)' }}>新增桌次</h3>
        <div className="input-group">
          <label className="input-label">桌次名稱</label>
          <input type="text" name="name" className="input-field" required placeholder="例如：第一桌 或 女方親友桌" />
        </div>
        <button type="submit" className="btn mt-1">新增</button>
      </form>

      <div>
        <h3 style={{ marginBottom: '1rem', color: 'var(--accent-gold)' }}>現有桌次與登入網址</h3>
        <p className="text-muted" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
          提示：您可以將這些網址轉換為 QR Code 印在桌牌上。
        </p>
        {loading ? <p>載入中...</p> : (
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {tables.map(t => (
              <li key={t.id} style={{ padding: '1rem', border: '1px solid var(--border-gold)', borderRadius: '8px', position: 'relative' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1.2rem' }}>{t.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem', wordBreak: 'break-all' }}>
                  網址: <Link href={`/table/${t.token}`} style={{ color: 'var(--accent-gold)' }} target="_blank">{origin}/table/{t.token}</Link>
                </div>
                <div style={{ color: 'var(--accent-gold)' }}>目前分數: {t.score}</div>
                
                <div style={{ marginTop: '1rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>
                  <h4 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>任務進度與重置</h4>
                  <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
                    {t.tableChallenges?.map((tc: any) => {
                      const q = questions.find((q: any) => q.id === tc.questionId)
                      if (!q) return null
                      return (
                        <div key={tc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                          <div>
                            <span>{q.phase === 2 ? '[階段2]' : '[階段1]'} {q.title || `任務 ${q.order}`}</span>
                            <span style={{ marginLeft: '1rem', color: tc.status === 'COMPLETED' ? '#44ff44' : tc.status === 'FAILED' ? '#ff4444' : '#ffb400' }}>
                              {tc.status === 'COMPLETED' ? '已完成' : tc.status === 'FAILED' ? '挑戰失敗' : '進行中'}
                            </span>
                            {tc.wrongAttempts > 0 && <span style={{ marginLeft: '0.5rem', color: '#ff4444' }}>(錯 {tc.wrongAttempts} 次)</span>}
                          </div>
                          <button 
                            onClick={async () => {
                              if (confirm(`確定要重置 ${t.name} 的「${q.title || `任務 ${q.order}`}」嗎？這會清除這桌對此題的錯誤次數與過關紀錄。`)) {
                                await resetTableChallenge(t.id, q.id)
                                fetchTables()
                              }
                            }}
                            style={{ background: '#333', color: '#fff', border: '1px solid #555', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            重置
                          </button>
                        </div>
                      )
                    })}
                    {(!t.tableChallenges || t.tableChallenges.length === 0) && <div style={{ color: '#666' }}>尚未解鎖任何任務</div>}
                  </div>
                </div>
                <button 
                  onClick={async () => { await deleteTable(t.id); fetchTables(); }}
                  style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', color: '#ff4444', border: 'none', cursor: 'pointer' }}>
                  刪除
                </button>
              </li>
            ))}
            {tables.length === 0 && <p className="text-muted">尚無桌次</p>}
          </ul>
        )}
      </div>
    </div>
  )
}
