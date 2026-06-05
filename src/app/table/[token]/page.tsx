'use client'

import { useState, useEffect, use, useRef } from 'react'
import { getTableState, getQuestions, startChallenge, submitChallengeAnswer, getTables } from '@/app/actions'
import imageCompression from 'browser-image-compression'

export default function TableQuizPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  
  const [playerId, setPlayerId] = useState<string>('')
  
  const [table, setTable] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [allTables, setAllTables] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [answerInput, setAnswerInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  
  // Initial load
  useEffect(() => {
    let id = localStorage.getItem('wedding_player_id')
    if (!id) {
      id = 'p_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('wedding_player_id', id)
    }
    setPlayerId(id)
    
    // Fetch static questions once
    getQuestions().then(setQuestions).catch(console.error)
  }, [])

  // Fast polling only for table state to save DB connections
  const fetchTableState = async () => {
    try {
      const stateData = await getTableState(token)
      setTable(stateData.table)
      setSettings(stateData.settings)
      setLoading(false)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchTableState()
    // Increase polling interval to 5 seconds to prevent database connection exhaustion
    const interval = setInterval(fetchTableState, 5000)
    return () => clearInterval(interval)
  }, [token])

  // Fetch leaderboard data only when opened
  useEffect(() => {
    if (showLeaderboard) {
      getTables().then(setAllTables).catch(console.error)
    }
  }, [showLeaderboard])

  const playSiren = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'square';
      
      const now = ctx.currentTime;
      // Classic emergency siren sound (Hi-Lo)
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.setValueAtTime(1000, now + 0.4);
      osc.frequency.setValueAtTime(800, now + 0.8);
      osc.frequency.setValueAtTime(1000, now + 1.2);
      osc.frequency.setValueAtTime(800, now + 1.6);
      osc.frequency.setValueAtTime(1000, now + 2.0);
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 2.5);
      
      osc.start(now);
      osc.stop(now + 2.5);
    } catch(e) {
      console.error("Audio playback failed", e);
    }
  }

  // Play sound when emergency mode is triggered
  useEffect(() => {
    if (settings?.activeEmergencyMode > 0) {
      playSiren()
    }
  }, [settings?.activeEmergencyMode])

  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (table?.activeChallengeId && table?.challengeStartTime) {
      const timer = setInterval(() => {
        const start = new Date(table.challengeStartTime).getTime()
        setElapsed(Math.floor((Date.now() - start) / 1000))
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [table?.activeChallengeId, table?.challengeStartTime])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    
    try {
      // --- IMAGE COMPRESSION ---
      // This is crucial for performance. Compresses 5-10MB mobile photos to ~300KB
      const options = {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: 'image/jpeg' as string
      }
      const compressedFile = await imageCompression(file, options)

      const formData = new FormData()
      formData.append('file', compressedFile, 'compressed.jpg')
      formData.append('token', token)
      if (settings?.activeEmergencyMode) {
        formData.append('mode', settings.activeEmergencyMode.toString())
      }
      
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const result = await res.json()
      if (result.success) {
        setSuccessMsg('✅ 評分完成！您可以在上方看到成績。')
        await fetchTableState()
        setTimeout(() => setSuccessMsg(''), 5000)
      } else {
        setError(result.error || '上傳失敗')
      }
    } catch (err) {
      console.error(err)
      setError('上傳發生錯誤')
    }
    setUploading(false)
  }

  const [startingId, setStartingId] = useState<number | null>(null)
  
  const handleStartChallenge = async (qId: number) => {
    if (startingId) return
    setStartingId(qId)
    try {
      await startChallenge(table.id, qId)
      await fetchTableState()
    } catch (err) {
      console.error(err)
      alert('發生錯誤，請稍後重試')
    }
    setStartingId(null)
  }

  const handleChallengeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || !table.activeChallengeId) return
    
    setSubmitting(true)
    setError('')
    setSuccessMsg('')
    
    try {
      const res = await submitChallengeAnswer(table.id, table.activeChallengeId, playerId, answerInput)
      if (res.error) {
        setError(res.error)
      } else if (res.correct) {
        setSuccessMsg(`答對了！花費時間：${res.timeSpent} 秒`)
        setAnswerInput('')
      } else if (res.failed) {
        setError('已達錯誤上限！任務失敗。')
      } else {
        setError(`答案錯誤！全桌剩餘嘗試次數：${res.remaining} 次`)
      }
      // Do not await to free UI quickly
      fetchTableState()
    } catch (err) {
      setError('系統錯誤')
    }
    setSubmitting(false)
  }

  const handleGiveUp = async () => {
    if (!table?.activeChallengeId) return
    if (!confirm('按下確定後，此題目無法再次挑戰，這題直接會是最低分')) return
    
    setSubmitting(true)
    try {
      const { giveUpChallenge } = await import('@/app/actions')
      await giveUpChallenge(table.id, table.activeChallengeId)
      await fetchTableState()
    } catch (err) {
      console.error(err)
      alert('發生錯誤')
    }
    setSubmitting(false)
  }

  if (loading) return <div className="container center-content"><p>載入中...</p></div>
  if (!table) return <div className="container center-content"><p>找不到此桌次，請確認 QR Code 是否正確。</p></div>

  // --- Render Emergency Mode ---
  if (settings?.activeEmergencyMode > 0) {
    const mode = settings.activeEmergencyMode
    const filteredSubmissions = table.emergencySubmissions?.filter((s: any) => s.mode === mode) || []
    const latestSubmission = filteredSubmissions[0]
    let bestSubmission = null
    if (filteredSubmissions.length > 0) {
      bestSubmission = filteredSubmissions.reduce((prev: any, current: any) => (prev.score > current.score) ? prev : current)
    }

    const modeTitle = mode === 1 ? '立刻拍下新郎最帥氣的照片！' : '立刻拍下新郎新娘最甜蜜的合照！'

    return (
      <div className="container center-content animate-fade-in" style={{ backgroundColor: '#4a0e0e' }}>
        <div className="card text-center" style={{ maxWidth: '600px', margin: '0 auto', width: '100%', borderColor: '#ff4444' }}>
          <h1 className="title" style={{ color: '#ff4444', fontSize: '2.5rem' }}>🚨 緊急任務 {mode === 1 ? '一' : '二'} 🚨</h1>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>{modeTitle}</h2>
          {bestSubmission && (
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255, 215, 0, 0.1)', border: '1px dashed var(--accent-gold)', borderRadius: '8px', marginBottom: '2rem' }}>
              <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>👑 本桌目前最高分：{bestSubmission.score} 分</span>
            </div>
          )}
          {latestSubmission && (
            <div style={{ marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-gold)' }}>
              <img src={latestSubmission.imageUrl} alt="Uploaded" style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem', maxHeight: '300px', objectFit: 'cover' }} />
              <div style={{ color: 'var(--accent-gold)', fontSize: '2rem', fontWeight: 'bold' }}>{latestSubmission.score} 分</div>
              <p style={{ fontStyle: 'italic', marginTop: '0.5rem' }}>"{latestSubmission.comment}"</p>
            </div>
          )}
          <div>
            <input type="file" accept="image/*" capture="environment" ref={fileInputRef} style={{ display: 'none' }} onChange={handleUpload}/>
            <button className="btn" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ background: 'linear-gradient(135deg, #ff4444, #aa0000)', color: 'white' }}>
              {uploading ? '評分中...' : (latestSubmission ? '📸 再挑戰一次' : '📸 開啟相機拍照上傳')}
            </button>
            {error && <div style={{ color: '#ff4444', marginTop: '1rem' }}>{error}</div>}
            {successMsg && <div style={{ color: '#44ff44', marginTop: '1rem' }}>{successMsg}</div>}
          </div>
        </div>
      </div>
    )
  }

  // --- Render Phase 1 & 2 ---
  if (settings?.phase1Active || settings?.phase2Active) {
    const activePhase = settings.phase1Active ? 1 : 2
    const phaseQuestions = questions.filter(q => q.phase === activePhase)
    if (table.activeChallengeId) {
      // Active Challenge UI
      const activeQuestion = questions.find(q => q.id === table.activeChallengeId)
      const tableChallenge = table.tableChallenges?.find((tc: any) => tc.questionId === table.activeChallengeId)
      
      return (
        <div className="container animate-fade-in" style={{ justifyContent: 'center' }}>
          <div className="card text-center" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <h1 className="title" style={{ fontSize: '2rem' }}>{table.name}</h1>
            <div style={{ color: 'var(--accent-gold)', fontSize: '2.5rem', fontWeight: 'bold', margin: '1rem 0' }}>
              ⏱️ {elapsed} 秒
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>{activeQuestion?.text}</h2>
            {activeQuestion?.type === 'PUZZLE' && activeQuestion.imageUrl && (
              <div style={{ marginBottom: '1.5rem', border: '1px solid var(--border-gold)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(212, 175, 55, 0.1)', color: 'var(--accent-gold)', fontSize: '0.9rem' }}>
                  👉 請雙指放大圖片尋找密碼，或長按圖片儲存
                </div>
                <img src={activeQuestion.imageUrl} alt="puzzle" style={{ width: '100%', display: 'block', touchAction: 'pan-x pan-y pinch-zoom' }} />
              </div>
            )}
            {activeQuestion?.hint && <p style={{ color: 'var(--accent-gold)', marginBottom: '2rem', fontStyle: 'italic' }}>提示：{activeQuestion.hint}</p>}
            
            <form onSubmit={handleChallengeSubmit}>
              <div className="input-group">
                <input type="text" className="input-field text-center" placeholder="請輸入答案" value={answerInput} onChange={(e) => setAnswerInput(e.target.value)} required disabled={submitting} />
              </div>
              {error && <div style={{ color: '#ff4444', marginBottom: '1rem' }}>{error}</div>}
              {successMsg && <div style={{ color: '#44ff44', marginBottom: '1rem' }}>{successMsg}</div>}
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                <button type="submit" className="btn" disabled={submitting} style={{ flex: 1 }}>{submitting ? '送出中...' : '送出答案'}</button>
                <button type="button" onClick={handleGiveUp} className="btn" disabled={submitting} style={{ backgroundColor: '#333', borderColor: '#555', color: '#ccc' }}>放棄</button>
              </div>
            </form>
            <div style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
              全桌剩餘嘗試次數：{10 - (tableChallenge?.wrongAttempts || 0)} 次
            </div>
          </div>
        </div>
      )
    } else {
      // Lobby UI
      return (
        <div className="container animate-fade-in" style={{ justifyContent: 'flex-start', paddingTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', width: '100%', maxWidth: '600px', margin: '0 auto 2rem' }}>
            <h1 className="title" style={{ margin: 0 }}>{table.name} {activePhase === 1 ? '任務大廳' : '第二階段任務'}</h1>
          </div>
          
          <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {phaseQuestions.map((q, idx) => {
              const tc = table.tableChallenges?.find((t: any) => t.questionId === q.id)
              const status = tc?.status || 'IDLE'
              
              return (
                <div key={q.id} className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>任務 {idx + 1} {q.type === 'MANUAL' ? '(工作人員評分)' : ''}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                      {status === 'COMPLETED' ? (q.type === 'MANUAL' ? `得分：${tc.manualScore} 分` : `通關耗時：${tc.timeSpent} 秒`) : ''}
                      {status === 'FAILED' ? '挑戰失敗 ❌' : ''}
                      {status === 'IDLE' ? '尚未解鎖' : ''}
                      {status === 'ACTIVE' ? '挑戰進行中 🔥' : ''}
                    </div>
                  </div>
                  <div>
                    {status === 'IDLE' && q.type === 'QUIZ' && (
                      <button className="btn" style={{ padding: '0.5rem 1rem', margin: 0, fontSize: '1rem' }} onClick={() => handleStartChallenge(q.id)} disabled={startingId !== null}>
                        {startingId === q.id ? '開啟中...' : '開啟挑戰'}
                      </button>
                    )}
                    {status === 'ACTIVE' && q.type === 'QUIZ' && (
                      <button className="btn" style={{ padding: '0.5rem 1rem', margin: 0, fontSize: '1rem', background: 'var(--accent-gold)', color: '#000' }} onClick={() => handleStartChallenge(q.id)}>
                        進入
                      </button>
                    )}
                    {q.type === 'MANUAL' && (
                      <div style={{ color: 'var(--accent-gold)' }}>等待評分</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* FAB Leaderboard Button */}
          <button 
            onClick={() => {
              setShowLeaderboard(true)
              getTables().then(setAllTables).catch(console.error) // Refresh immediately
            }}
            style={{ position: 'fixed', bottom: '2rem', right: '2rem', width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-gold), #b8860b)', color: '#000', fontSize: '1.5rem', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.5)', cursor: 'pointer', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
            🏆
          </button>

          {/* Leaderboard Modal */}
          {showLeaderboard && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
              <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
                <button onClick={() => setShowLeaderboard(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>✖</button>
                
                <h2 style={{ color: 'var(--accent-gold)', textAlign: 'center', marginBottom: '1.5rem' }}>排行榜</h2>
                
                <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>本桌戰況 ({table.name})</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>緊急任務：</span>
                    <span style={{ color: 'var(--accent-gold)' }}>{table.score} 分</span>
                  </div>
                  {table.tableChallenges?.map((tc: any) => {
                    const q = questions.find(q => q.id === tc.questionId)
                    return (
                      <div key={tc.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span>{q?.phase === 2 ? '[第二階段] ' : '[第一階段] '}任務 {q?.order}：</span>
                        <span style={{ color: 'var(--accent-gold)' }}>
                          {tc.status === 'COMPLETED' ? (q?.type === 'MANUAL' ? `${tc.manualScore} 分` : `${tc.timeSpent} 秒`) : '未完成'}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div>
                  <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>全場總排名</h3>
                  {allTables.map((t, index) => {
                    return (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <span>
                          <span style={{ display: 'inline-block', width: '24px', color: index < 3 ? 'var(--accent-gold)' : 'white' }}>{index + 1}.</span>
                          {t.name}
                        </span>
                        <span style={{ color: 'var(--accent-gold)' }}>
                          積分 {t.totalScore}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }
  }

  // --- Waiting State ---
  return (
    <div className="container center-content animate-fade-in">
      <div className="card text-center" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        <h1 className="title" style={{ fontSize: '2rem' }}>{table.name}</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginTop: '2rem' }}>請等待主持人開放遊戲...</p>
      </div>
    </div>
  )
}
