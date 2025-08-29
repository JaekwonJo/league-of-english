import React from 'react';

const AdminPage = () => {
  return (
    <div style={styles.container}>
      <h1>⚙️ 관리자 페이지</h1>
      <div style={styles.card}>
        <h2>📄 문서 업로드</h2>
        <p>문서 업로드 기능 준비 중입니다.</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    padding: '30px',
    marginTop: '20px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
  }
};

export default AdminPage;