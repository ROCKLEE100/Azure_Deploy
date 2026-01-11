import Chat from './components/Chat'
import { Login } from './components/Login'
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useEffect } from 'react';

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
          <div className="max-w-md w-full bg-gray-800 p-8 rounded-lg shadow-xl border border-red-500/50">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Application Error</h1>
            <p className="text-gray-300 mb-4">Something went wrong initializing the application.</p>
            <pre className="bg-black/50 p-4 rounded text-sm font-mono text-red-400 overflow-auto">
              {this.state.error && this.state.error.toString()}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

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
