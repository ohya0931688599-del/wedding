import Link from 'next/link'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="container" style={{ maxWidth: '1000px' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-gold)', paddingBottom: '1rem' }}>
        <h1 className="title" style={{ margin: 0, fontSize: '2rem' }}>後台管理</h1>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/admin" className="btn-secondary" style={{ padding: '0.5rem 1rem', textDecoration: 'none', borderRadius: '4px' }}>排行榜</Link>
          <Link href="/admin/questions" className="btn-secondary" style={{ padding: '0.5rem 1rem', textDecoration: 'none', borderRadius: '4px' }}>題目管理</Link>
          <Link href="/admin/tables" className="btn-secondary" style={{ padding: '0.5rem 1rem', textDecoration: 'none', borderRadius: '4px' }}>桌次管理</Link>
          <Link href="/admin/emergency" style={{ padding: '0.5rem 1rem', textDecoration: 'none', borderRadius: '4px', background: '#aa0000', color: 'white', fontWeight: 'bold' }}>🚨 緊急任務</Link>
        </nav>
      </header>
      <main>
        {children}
      </main>
    </div>
  )
}
