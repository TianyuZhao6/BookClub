import { useEffect, useContext, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { logout } from '../api/userAPI';
import UserContext from '../user/UserContext';
import SessionContext from '../session/SessionContext';
export default function LogoutPage() {
  const { setUsername } = useContext(UserContext);
  const { session, setSession } = useContext(SessionContext);
  const [done, setDone] = useState(false);
  useEffect(() => {
    async function run() {
      if (session) await logout({}, session);
      setUsername(''); setSession(''); setDone(true);
    }
    run();
  }, [session, setUsername, setSession]);
  return done ? <Navigate to='/login' replace /> : <p>Signing out…</p>;
}
