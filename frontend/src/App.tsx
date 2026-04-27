import React, { useState, useEffect } from 'react';
import { DisclaimerModal } from './components/DisclaimerModal';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  tier: 'free' | 'premium';
  storageQuota: number;
  storageUsed: number;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for token in URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      localStorage.setItem('token', token);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Load user profile
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      loadUserProfile(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const loadUserProfile = async (token: string) => {
    try {
      const response = await fetch('/api/users/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);

        // Check disclaimer status
        const disclaimerResponse = await fetch('/api/disclaimer/status', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (disclaimerResponse.ok) {
          const disclaimerData = await disclaimerResponse.json();
          setDisclaimerAccepted(disclaimerData.accepted);
        }
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
    setDisclaimerAccepted(false);
  };

  const handleDisclaimerAccept = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/disclaimer/accept', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setDisclaimerAccepted(true);
      }
    } catch (error) {
      console.error('Failed to accept disclaimer:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (!disclaimerAccepted) {
    return (
      <DisclaimerModal onAccept={handleDisclaimerAccept} />
    );
  }

  return (
    <Dashboard user={user} onLogout={handleLogout} />
  );
}

export default App;
