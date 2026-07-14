'use client'

import { useState, useEffect } from 'react'
import { addQuestion, deleteQuestion, getQuestions, updateQuestion } from '@/app/actions'

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [questionType, setQuestionType] = useState('QUIZ')
  const [uploading, setUploading] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<any>(null)

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
    
    try {
      let imageUrl = ''
      let imageUrls: string[] = []
      
      if (formData.get('type') === 'IMAGE_QUIZ') {
         const files = formData.getAll('imageFiles') as File[]
         for (const file of files) {
            if (file && file.size > 0) {
              const uploadData = new FormData()
              uploadData.append('file', file)
              const res = await fetch('/api/admin/upload', { method: 'POST', body: uploadData })
              const resJson = await res.json()
              if (resJson.success) {
                imageUrls.push(resJson.url)
              }
            }
         }
      }

      const payload = {
        order: parseInt(formData.get('order') as string),
        title: formData.get('title') as string || undefined,
        text: formData.get('text') as string,
        hint: formData.get('hint') as string,
        correctAnswer: formData.get('correctAnswer') as string,
        type: formData.get('type') as 'QUIZ' | 'MANUAL' | 'IMAGE_QUIZ',
        phase: parseInt(formData.get('phase') as string),
        imageUrl: imageUrl || undefined,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined
      }

      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, payload)
        setEditingQuestion(null)
      } else {
        await addQuestion(payload)
      }
      
      try { form.reset() } catch (e) {} // Ignore reset error if unmounted
      await fetchQuestions()
    } catch (err: any) {
      alert("儲存時發生錯誤: " + (err.message || String(err)))
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const handleEditClick = (q: any) => {
    setEditingQuestion(q)
    setQuestionType(q.type)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingQuestion(null)
    setQuestionType('QUIZ')
  }

  return (
    <div className="card animate-fade-in">
      <h2 className="title" style={{ fontSize: '1.8rem' }}>題目管理</h2>
      
      <form key={editingQuestion ? editingQuestion.id : 'new'} onSubmit={handleSubmit} style={{ marginBottom: '3rem', padding: '1.5rem', background: 'rgba(253, 251, 247, 0.02)', borderRadius: '8px', border: '1px solid var(--border-gold)' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--accent-gold)' }}>{editingQuestion ? '編輯題目 (編輯中)' : '新增題目'}</h3>
        <div className="input-group">
          <label className="input-label">題型</label>
          <select name="type" className="input-field" required value={questionType} onChange={e => setQuestionType(e.target.value)}>
            <option value="QUIZ" style={{ color: '#000' }}>計時解謎 (賓客自行作答)</option>
            <option value="MANUAL" style={{ color: '#000' }}>實體考驗 (工作人員評分)</option>
            <option value="IMAGE_QUIZ" style={{ color: '#000' }}>多圖解謎 (多張圖片)</option>
          </select>
        </div>
        {questionType === 'PUZZLE' && (
          <div className="input-group">
            <label className="input-label">上傳拼圖底圖 (推薦 1000px 以上高畫質) {editingQuestion && <span style={{fontSize:'0.8rem', color:'#aaa'}}>(留空代表不更換圖片)</span>}</label>
            <input type="file" name="imageFile" accept="image/*" className="input-field" required={questionType === 'PUZZLE' && !editingQuestion} />
          </div>
        )}
        {questionType === 'IMAGE_QUIZ' && (
          <div className="input-group">
            <label className="input-label">上傳多張圖片 {editingQuestion && <span style={{fontSize:'0.8rem', color:'#aaa'}}>(留空代表不更換圖片)</span>}</label>
            <input type="file" name="imageFiles" accept="image/*" multiple className="input-field" required={questionType === 'IMAGE_QUIZ' && !editingQuestion} />
          </div>
        )}
        <div className="input-group">
          <label className="input-label">所屬階段</label>
          <select name="phase" className="input-field" required defaultValue={editingQuestion ? editingQuestion.phase : "1"}>
            <option value="1" style={{ color: '#000' }}>第一階段 (入席期間)</option>
            <option value="2" style={{ color: '#000' }}>第二階段 (二次進場後)</option>
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">順序 (數字越小越前面)</label>
          <input type="number" name="order" className="input-field" required defaultValue={editingQuestion ? editingQuestion.order : ''} />
        </div>
        <div className="input-group">
          <label className="input-label">題目名稱 (選填，大廳顯示用)</label>
          <input type="text" name="title" className="input-field" placeholder="例如：第一關：新郎的秘密" defaultValue={editingQuestion ? (editingQuestion.title || '') : ''} />
        </div>
        <div className="input-group">
          <label className="input-label">題目內容 {questionType === 'IMAGE_QUIZ' && <span style={{fontSize:'0.8rem', color:'#aaa'}}>(可留白)</span>}</label>
          <textarea name="text" className="input-field" required={questionType !== 'IMAGE_QUIZ'} defaultValue={editingQuestion ? editingQuestion.text : ''} rows={4} style={{ resize: 'vertical' }} />
        </div>
        <div className="input-group">
          <label className="input-label">正確答案 (不分大小寫)</label>
          <input type="text" name="correctAnswer" className="input-field" required defaultValue={editingQuestion ? editingQuestion.correctAnswer : ''} />
        </div>
        <div className="input-group">
          <label className="input-label">提示 (選填，可幫助賓客)</label>
          <input type="text" name="hint" className="input-field" defaultValue={editingQuestion ? editingQuestion.hint : ''} />
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" className="btn-primary" disabled={uploading}>
            {uploading ? '上傳中...' : (editingQuestion ? '儲存修改' : '新增題目')}
          </button>
          {editingQuestion && (
            <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
              取消編輯
            </button>
          )}
        </div>
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
                      {q.order}. {q.title ? <span style={{color:'var(--accent-gold)'}}>【{q.title}】</span> : ''} {q.text} 
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: q.type === 'MANUAL' ? '#4a0e0e' : (q.type === 'PUZZLE' ? '#0f3a4e' : (q.type === 'IMAGE_QUIZ' ? '#4e3a0f' : '#333')), borderRadius: '4px' }}>
                        {q.type === 'MANUAL' ? '實體考驗' : (q.type === 'PUZZLE' ? '拼圖考驗' : (q.type === 'IMAGE_QUIZ' ? '多圖解謎' : '計時解謎'))}
                      </span>
                    </div>
                    {q.imageUrl && <img src={q.imageUrl} alt="puzzle" style={{ maxHeight: '100px', borderRadius: '4px', marginBottom: '0.5rem', display: 'block' }} />}
                    {q.imageUrls && q.imageUrls.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '0.5rem' }}>
                        {q.imageUrls.map((url: string, idx: number) => (
                          <img key={idx} src={url} alt={`img-${idx}`} style={{ maxHeight: '80px', borderRadius: '4px' }} />
                        ))}
                      </div>
                    )}
                    {q.hint && <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>提示: {q.hint}</div>}
                    <div style={{ color: 'var(--accent-gold)' }}>答案: {q.correctAnswer}</div>
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '1rem' }}>
                      <button 
                        onClick={() => handleEditClick(q)}
                        style={{ background: 'transparent', color: 'var(--accent-gold)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                        編輯
                      </button>
                      <button 
                        onClick={async () => { await deleteQuestion(q.id); fetchQuestions(); }}
                        style={{ background: 'transparent', color: '#ff4444', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                        刪除
                      </button>
                    </div>
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
                      {q.order}. {q.title ? <span style={{color:'var(--accent-gold)'}}>【{q.title}】</span> : ''} {q.text} 
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: q.type === 'MANUAL' ? '#4a0e0e' : (q.type === 'PUZZLE' ? '#0f3a4e' : (q.type === 'IMAGE_QUIZ' ? '#4e3a0f' : '#333')), borderRadius: '4px' }}>
                        {q.type === 'MANUAL' ? '實體考驗' : (q.type === 'PUZZLE' ? '拼圖考驗' : (q.type === 'IMAGE_QUIZ' ? '多圖解謎' : '計時解謎'))}
                      </span>
                    </div>
                    {q.imageUrl && <img src={q.imageUrl} alt="puzzle" style={{ maxHeight: '100px', borderRadius: '4px', marginBottom: '0.5rem', display: 'block' }} />}
                    {q.imageUrls && q.imageUrls.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '0.5rem' }}>
                        {q.imageUrls.map((url: string, idx: number) => (
                          <img key={idx} src={url} alt={`img-${idx}`} style={{ maxHeight: '80px', borderRadius: '4px' }} />
                        ))}
                      </div>
                    )}
                    {q.hint && <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>提示: {q.hint}</div>}
                    <div style={{ color: 'var(--accent-gold)' }}>答案: {q.correctAnswer}</div>
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '1rem' }}>
                      <button 
                        onClick={() => handleEditClick(q)}
                        style={{ background: 'transparent', color: 'var(--accent-gold)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                        編輯
                      </button>
                      <button 
                        onClick={async () => { await deleteQuestion(q.id); fetchQuestions(); }}
                        style={{ background: 'transparent', color: '#ff4444', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                        刪除
                      </button>
                    </div>
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
