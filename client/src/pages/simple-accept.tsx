import { useEffect, useState } from "react";

export default function SimpleAccept() {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Extract token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (tokenParam) {
      setToken(tokenParam);
      setStatus('ready');
    } else {
      setStatus('error');
      setMessage('No invitation token found');
    }
  }, []);

  const handleAccept = async () => {
    if (!token) return;
    
    setStatus('processing');
    setMessage('Processing invitation...');
    
    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for auth
      });
      
      if (response.status === 401) {
        setMessage('Redirecting to login...');
        // Pass invitation token to login for auto-acceptance
        setTimeout(() => {
          window.location.href = `/api/login?invitation=${token}`;
        }, 1000);
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to accept invitation');
      }
      
      const data = await response.json();
      setStatus('success');
      
      // Handle undefined workspaceName gracefully
      const workspaceName = data.workspaceName || 'the workspace';
      setMessage(`Welcome to ${workspaceName}!`);
      
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
      
    } catch (error) {
      setStatus('error');
      setMessage(error?.message || 'Failed to accept invitation');
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#f9fafb'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center'
      }}>
        <h1 style={{ marginBottom: '1rem', color: '#1f2937' }}>
          Join Workspace
        </h1>
        
        {status === 'loading' && (
          <p>Loading invitation...</p>
        )}
        
        {status === 'ready' && (
          <>
            <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
              You've been invited to join a workspace. Click below to accept.
            </p>
            <button
              onClick={handleAccept}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
                width: '100%'
              }}
            >
              Accept Invitation
            </button>
          </>
        )}
        
        {status === 'processing' && (
          <div>
            <div style={{
              width: '24px',
              height: '24px',
              border: '2px solid #e5e7eb',
              borderTop: '2px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}></div>
            <p>{message}</p>
          </div>
        )}
        
        {status === 'success' && (
          <div>
            <div style={{ color: '#10b981', marginBottom: '1rem' }}>✓</div>
            <p>{message}</p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Redirecting to dashboard...
            </p>
          </div>
        )}
        
        {status === 'error' && (
          <div>
            <div style={{ color: '#ef4444', marginBottom: '1rem' }}>✗</div>
            <p style={{ color: '#ef4444' }}>{message}</p>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}