import { getTables, togglePhase1 } from '@/app/actions'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const tables = await getTables()
  const settings = await prisma.systemSetting.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global', isEmergencyModeActive: false, phase1Active: false }
  })

  return (
    <div className="card animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 className="title" style={{ fontSize: '1.8rem', margin: 0 }}>總排行榜</h2>
        
        <form action={async () => {
          'use server'
          const { togglePhase1 } = await import('@/app/actions')
          await togglePhase1(!settings.phase1Active)
        }}>
          <button type="submit" className="btn" style={{ margin: 0, padding: '0.8rem 1.5rem', background: settings.phase1Active ? '#ff4444' : 'var(--accent-gold)', color: settings.phase1Active ? 'white' : '#000', border: 'none' }}>
            {settings.phase1Active ? '⏹ 關閉第一階段 (返回等待畫面)' : '▶️ 開始第一階段 (開放任務大廳)'}
          </button>
        </form>
      </div>

      <ul className="leaderboard-list mt-2">
        {tables.length === 0 && <p className="text-center text-muted">目前還沒有桌次資料</p>}
        {tables.map((table, index) => {
          const totalScore = table.totalScore
          return (
            <li key={table.id} className={`leaderboard-item ${index === 0 ? 'rank-1' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.5rem', color: 'var(--accent-gold)', fontWeight: 'bold', width: '30px' }}>
                  {index + 1}
                </span>
                <span style={{ fontSize: '1.2rem' }}>{table.name}</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>
                {totalScore} 分
              </div>
            </li>
          )
        })}
      </ul>

      <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border-gold)', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>危險操作區 (測試用)</h3>
        <form action={async () => {
          'use server'
          const { resetGame } = await import('@/app/actions')
          await resetGame()
        }}>
          <button type="submit" className="btn" style={{ backgroundColor: '#4a0e0e', color: '#ff4444', borderColor: '#ff4444', border: '1px solid' }}>
            ⚠️ 重啟遊戲 (清空所有成績與進度)
          </button>
        </form>
      </div>
    </div>
  )
}
