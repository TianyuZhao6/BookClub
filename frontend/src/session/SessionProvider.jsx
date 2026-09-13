import { useCallback, useEffect, useState } from 'react';
import SessionContext from './SessionContext';
export default function SessionProvider({ children }) {
  const [session, update] = useState(() => sessionStorage.getItem('sessionID') || '');
  const setSession = useCallback(value => {
    if (value) sessionStorage.setItem('sessionID', value);
    else sessionStorage.removeItem('sessionID');
    update(value);
  }, []);
  useEffect(() => {
    const clear = () => setSession('');
    window.addEventListener('bookclub:logout', clear);
    return () => window.removeEventListener('bookclub:logout', clear);
  }, [setSession]);
  return <SessionContext.Provider value={{ session, setSession }}>{children}</SessionContext.Provider>;
}
