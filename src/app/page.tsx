export default function Home() {
  return (
    <main className="container center-content animate-fade-in">
      <div className="card text-center" style={{ maxWidth: '500px', width: '100%' }}>
        <h1 className="title">歡迎參加我們的婚禮</h1>
        <p className="subtitle" style={{ marginBottom: '1rem' }}>
          Welcome to Our Wedding
        </p>
        <p style={{ lineHeight: '1.6', marginBottom: '2rem' }}>
          請掃描您桌上的 QR Code 以進入專屬的答題頁面。<br />
          Please scan the QR code on your table to join the quiz!
        </p>
        <div style={{ opacity: 0.5 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <rect x="7" y="7" width="3" height="3"></rect>
            <rect x="14" y="7" width="3" height="3"></rect>
            <rect x="7" y="14" width="3" height="3"></rect>
            <rect x="14" y="14" width="3" height="3"></rect>
          </svg>
        </div>
      </div>
    </main>
  );
}
