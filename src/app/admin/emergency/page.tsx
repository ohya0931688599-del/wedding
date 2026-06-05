'use client'

import { useState, useEffect } from 'react'
import { toggleEmergencyMode, getEmergencySubmissions } from '@/app/actions'

export default function EmergencyPage() {
  const [activeMode, setActiveMode] = useState(0)
  const [submissionsMode1, setSubmissionsMode1] = useState<any[]>([])
  const [submissionsMode2, setSubmissionsMode2] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  const fetchData = async () => {
    try {
      const subs1 = await getEmergencySubmissions(1)
      const subs2 = await getEmergencySubmissions(2)
      setSubmissionsMode1(subs1)
      setSubmissionsMode2(subs2)
      
      const res = await fetch('/api/emergency-state')
      const data = await res.json()
      setActiveMode(data.activeEmergencyMode || (data.isActive ? 1 : 0))
      
      setLoading(false)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleToggle = async (mode: number) => {
    setToggling(true)
    if (activeMode === mode) {
      await toggleEmergencyMode(0)
      setActiveMode(0)
    } else {
      await toggleEmergencyMode(mode)
      setActiveMode(mode)
    }
    setToggling(false)
    fetchData()
  }

  if (loading) return <div className="card">載入中...</div>

  const renderSubmissions = (subs: any[]) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
      {subs.length === 0 && <p className="text-muted">目前還沒有桌次上傳照片</p>}
      {subs.map((sub, index) => (
        <div key={sub.id} style={{ border: '1px solid var(--border-gold)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'rgba(253, 251, 247, 0.02)' }}>
          <img src={sub.imageUrl} alt="Uploaded" style={{ width: '100%', height: '250px', objectFit: 'cover' }} />
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{sub.table.name}</span>
              <span style={{ color: 'var(--accent-gold)', fontSize: '1.5rem', fontWeight: 'bold' }}>{sub.score} 分</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>"{sub.comment}"</p>
            {index === 0 && <div style={{ color: '#44ff44', marginTop: '0.5rem', fontWeight: 'bold' }}>👑 目前最高分！</div>}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="card animate-fade-in" style={activeMode > 0 ? { borderColor: '#ff4444', borderWidth: '2px' } : {}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className="title" style={{ fontSize: '1.8rem', margin: 0, color: activeMode > 0 ? '#ff4444' : 'var(--accent-gold)' }}>
          {activeMode > 0 ? `🚨 緊急任務 ${activeMode} 進行中 🚨` : '緊急任務控制台'}
        </h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => handleToggle(1)} 
            disabled={toggling || activeMode === 2}
            className="btn" 
            style={{ width: 'auto', padding: '0.5rem 1rem', background: activeMode === 1 ? 'linear-gradient(135deg, #444, #222)' : 'linear-gradient(135deg, #ff4444, #aa0000)', color: 'white' }}
          >
            {activeMode === 1 ? '停止任務一' : '⚡ 觸發任務一 (新郎)'}
          </button>
          <button 
            onClick={() => handleToggle(2)} 
            disabled={toggling || activeMode === 1}
            className="btn" 
            style={{ width: 'auto', padding: '0.5rem 1rem', background: activeMode === 2 ? 'linear-gradient(135deg, #444, #222)' : 'linear-gradient(135deg, #ff4444, #aa0000)', color: 'white' }}
          >
            {activeMode === 2 ? '停止任務二' : '⚡ 觸發任務二 (雙人合照)'}
          </button>
        </div>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        觸發緊急任務後，所有桌次的手機畫面將會被中斷，並要求他們拍照上傳。由 AI 自動評分！
      </p>

      <div style={{ marginTop: '3rem' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--accent-gold)', borderBottom: '1px solid var(--border-gold)', paddingBottom: '0.5rem' }}>任務一 (新郎) 成果</h3>
        {renderSubmissions(submissionsMode1)}
      </div>

      <div style={{ marginTop: '3rem' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--accent-gold)', borderBottom: '1px solid var(--border-gold)', paddingBottom: '0.5rem' }}>任務二 (雙人合照) 成果</h3>
        {renderSubmissions(submissionsMode2)}
      </div>
    </div>
  )
}
