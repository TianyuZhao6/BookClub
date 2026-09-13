import { useCallback, useEffect, useState } from 'react';
import UserContext from './UserContext';
export default function UserProvider({ children }) {
  const [username, update] = useState(() => sessionStorage.getItem('username') || '');
  const setUsername = useCallback(value => {
    if (value) sessionStorage.setItem('username', value);
    else sessionStorage.removeItem('username');
    update(value);
  }, []);
  useEffect(() => {
    const clear = () => setUsername('');
    window.addEventListener('bookclub:logout', clear);
    return () => window.removeEventListener('bookclub:logout', clear);
  }, [setUsername]);
  return <UserContext.Provider value={{ username, setUsername }}>{children}</UserContext.Provider>;
}
