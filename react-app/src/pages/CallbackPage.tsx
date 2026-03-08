import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';

export default function CallbackPage() {
  const navigate = useNavigate();
  const { setAccessToken } = useAuthStore();

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');

    if (token) {
      setAccessToken(token);
      // Clear token from URL
      history.replaceState(null, '', window.location.pathname);
      navigate('/app', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, []);

  return null;
}
