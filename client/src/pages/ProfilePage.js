import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const ProfilePage = () => {
  const { user } = useAuth();
  
  return (
    <div style={styles.container}>
      <h1>👤 프로필</h1>
      <div style={styles.card}>
        <h2>{user?.name}</h2>
        <p>학교: {user?.school}</p>
        <p>학년: 고{user?.grade}</p>
        <p>역할: {user?.role}</p>
        <p>포인트: {user?.points || 0} LP</p>
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

export default ProfilePage;