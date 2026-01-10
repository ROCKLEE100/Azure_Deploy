import Chat from './components/Chat'
import { Login } from './components/Login'
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useEffect } from 'react';

function App() {
  const isAuthenticated = useIsAuthenticated();
  const { instance } = useMsal();

  useEffect(() => {
    // Handle redirect promise if needed
    instance.handleRedirectPromise().catch(e => console.error(e));
  }, [instance]);

  return (
    <div className="min-h-screen">
      {isAuthenticated ? <Chat /> : <Login />}
    </div>
  )
}

export default App
