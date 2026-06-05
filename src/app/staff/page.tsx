'use client'

import { useState, useEffect } from 'react'
import { getTables, getQuestions, updateManualScore } from '@/app/actions'

export default function StaffPage() {
  const [tables, setTables] = useState<any[]>([])
  const [manualQuestions, setManualQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({})

  const fetchData = async () => {
    try {
      const [tData, qData] = await Promise.all([
        getTables(),
        getQuestions()
      ])
      setTables(tData)
      setManualQuestions(qData.filter(q => q.type === 'MANUAL'))
      setLoading(false)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSaveScore = async (tableId: number, questionId: number, score: number) => {
    const key = `${tableId}-${questionId}`
    setSaving(prev => ({ ...prev, [key]: true }))
    try {
      await updateManualScore(tableId, questionId, score)
      await fetchData()
    } catch (err) {
      alert('儲存失敗！')
    }
    setSaving(prev => ({ ...prev, [key]: false }))
  }

  if (loading) return <div className="container center-content"><p>載入中...</p></div>

  if (manualQuestions.length === 0) {
    return (
      <div className="container center-content">
        <div className="card text-center">
          <h1 className="title">工作人員評分區</h1>
          <p>目前沒有需要人工評分的題目 (MANUAL)。請於總控台新增。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <h1 className="title text-center" style={{ marginBottom: '2rem' }}>工作人員評分區</h1>
        <p className="text-center" style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          請為各桌的挑戰輸入分數。輸入後請點擊「儲存」。
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {tables.map(table => (
            <div key={table.id} className="card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--accent-gold)' }}>
                {table.name}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                {manualQuestions.map(q => {
                  const challenge = table.tableChallenges?.find((tc: any) => tc.questionId === q.id)
                  const currentScore = challenge?.manualScore ?? 0
                  const key = `${table.id}-${q.id}`
                  
                  return (
                    <div key={q.id} style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>{q.text}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input 
                          type="number" 
                          className="input-field" 
                          style={{ margin: 0, padding: '0.5rem', width: '80px', textAlign: 'center' }}
                          defaultValue={currentScore}
                          id={`input-${key}`}
                        />
                        <button 
                          className="btn" 
                          style={{ margin: 0, padding: '0.5rem 1rem' }}
                          disabled={saving[key]}
                          onClick={() => {
                            const val = parseInt((document.getElementById(`input-${key}`) as HTMLInputElement).value) || 0
                            handleSaveScore(table.id, q.id, val)
                          }}
                        >
                          {saving[key] ? '儲存中...' : '儲存'}
                        </button>
                      </div>
                      {challenge?.status === 'COMPLETED' && (
                        <div style={{ color: '#44ff44', fontSize: '0.8rem', marginTop: '0.5rem' }}>✅ 已評分 ({challenge.manualScore} 分)</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
