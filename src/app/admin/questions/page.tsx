'use client'

import { useState, useEffect } from 'react'
import { addQuestion, deleteQuestion, getQuestions } from '@/app/actions'

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [questionType, setQuestionType] = useState('QUIZ')
  const [uploading, setUploading] = useState(false)

  const fetchQuestions = async () => {
    const data = await getQuestions()
    setQuestions(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchQuestions()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    setUploading(true)
    let imageUrl = ''
    if (formData.get('type') === 'PUZZLE') {
       const file = formData.get('imageFile') as File
       if (file && file.size > 0) {
          const uploadData = new FormData()
          uploadData.append('file', file)
          const res = await fetch('/api/admin/upload', { method: 'POST', body: uploadData })
          const resJson = await res.json()
          if (resJson.success) {
            imageUrl = resJson.url
          }
       }
    }

    await addQuestion({
      order: parseInt(formData.get('order') as string),
      text: formData.get('text') as string,
      hint: formData.get('hint') as string,
      correctAnswer: formData.get('correctAnswer') as string,
      type: formData.get('type') as 'QUIZ' | 'MANUAL' | 'PUZZLE',
      phase: parseInt(formData.get('phase') as string),
      imageUrl: imageUrl || undefined
    })
    form.reset()
    setUploading(false)
    fetchQuestions()
  }

  return (
    <div className="card animate-fade-in">
      <h2 className="title" style={{ fontSize: '1.8rem' }}>題目管理</h2>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '3rem', padding: '1.5rem', background: 'rgba(253, 251, 247, 0.02)', borderRadius: '8px', border: '1px solid var(--border-gold)' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--accent-gold)' }}>新增題目</h3>
        <div className="input-group">
          <label className="input-label">題型</label>
          <select name="type" className="input-field" required value={questionType} onChange={e => setQuestionType(e.target.value)}>
            <option value="QUIZ">計時解謎 (賓客自行作答)</option>
            <option value="MANUAL">實體考驗 (工作人員評分)</option>
            <option value="PUZZLE">拼圖考驗 (大家一起看圖找答案)</option>
          </select>
        </div>
        {questionType === 'PUZZLE' && (
          <div className="input-group">
            <label className="input-label">上傳拼圖底圖 (推薦 1000px 以上高畫質)</label>
            <input type="file" name="imageFile" accept="image/*" className="input-field" required={questionType === 'PUZZLE'} />
          </div>
        )}
        <div className="input-group">
          <label className="input-label">所屬階段</label>
          <select name="phase" className="input-field" required defaultValue="1">
            <option value="1">第一階段</option>
            <option value="2">第二階段</option>
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">順序 (數字)</label>
          <input type="number" name="order" className="input-field" required defaultValue={questions.length + 1} />
        </div>
        <div className="input-group">
          <label className="input-label">題目內容</label>
          <input type="text" name="text" className="input-field" required placeholder="例如：新郎最喜歡吃什麼？" />
        </div>
        <div className="input-group">
          <label className="input-label">提示 (選填)</label>
          <input type="text" name="hint" className="input-field" placeholder="例如：去伴郎那邊尋找答案" />
        </div>
        <div className="input-group">
          <label className="input-label">正確答案 (若是實體考驗可填 '-' 或留空)</label>
          <input type="text" name="correctAnswer" className="input-field" defaultValue="-" required />
        </div>
        <button type="submit" className="btn mt-1" disabled={uploading}>
          {uploading ? '上傳與新增中...' : '新增'}
        </button>
      </form>

      <div>
        <h3 style={{ marginBottom: '1rem', color: 'var(--accent-gold)' }}>現有題目</h3>
        {loading ? <p>載入中...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <h4 style={{ color: '#fff', borderBottom: '1px solid #333', paddingBottom: '0.5rem', marginBottom: '1rem' }}>第一階段題目</h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {questions.filter(q => q.phase === 1).map(q => (
                  <li key={q.id} style={{ padding: '1rem', border: '1px solid var(--border-gold)', borderRadius: '8px', position: 'relative' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      {q.order}. {q.text} 
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: q.type === 'MANUAL' ? '#4a0e0e' : (q.type === 'PUZZLE' ? '#0f3a4e' : '#333'), borderRadius: '4px' }}>
                        {q.type === 'MANUAL' ? '實體考驗' : (q.type === 'PUZZLE' ? '拼圖考驗' : '計時解謎')}
                      </span>
                    </div>
                    {q.imageUrl && <img src={q.imageUrl} alt="puzzle" style={{ maxHeight: '100px', borderRadius: '4px', marginBottom: '0.5rem', display: 'block' }} />}
                    {q.hint && <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>提示: {q.hint}</div>}
                    <div style={{ color: 'var(--accent-gold)' }}>答案: {q.correctAnswer}</div>
                    <button 
                      onClick={async () => { await deleteQuestion(q.id); fetchQuestions(); }}
                      style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', color: '#ff4444', border: 'none', cursor: 'pointer' }}>
                      刪除
                    </button>
                  </li>
                ))}
                {questions.filter(q => q.phase === 1).length === 0 && <p className="text-muted">尚無題目</p>}
              </ul>
            </div>

            <div>
              <h4 style={{ color: '#fff', borderBottom: '1px solid #333', paddingBottom: '0.5rem', marginBottom: '1rem' }}>第二階段題目</h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {questions.filter(q => q.phase === 2).map(q => (
                  <li key={q.id} style={{ padding: '1rem', border: '1px solid var(--border-gold)', borderRadius: '8px', position: 'relative' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      {q.order}. {q.text} 
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: q.type === 'MANUAL' ? '#4a0e0e' : (q.type === 'PUZZLE' ? '#0f3a4e' : '#333'), borderRadius: '4px' }}>
                        {q.type === 'MANUAL' ? '實體考驗' : (q.type === 'PUZZLE' ? '拼圖考驗' : '計時解謎')}
                      </span>
                    </div>
                    {q.imageUrl && <img src={q.imageUrl} alt="puzzle" style={{ maxHeight: '100px', borderRadius: '4px', marginBottom: '0.5rem', display: 'block' }} />}
                    {q.hint && <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>提示: {q.hint}</div>}
                    <div style={{ color: 'var(--accent-gold)' }}>答案: {q.correctAnswer}</div>
                    <button 
                      onClick={async () => { await deleteQuestion(q.id); fetchQuestions(); }}
                      style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', color: '#ff4444', border: 'none', cursor: 'pointer' }}>
                      刪除
                    </button>
                  </li>
                ))}
                {questions.filter(q => q.phase === 2).length === 0 && <p className="text-muted">尚無題目</p>}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
