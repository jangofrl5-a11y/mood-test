import React from 'react'
import ReactDOM from 'react-dom/client'
// ChakraProvider removed to avoid runtime compatibility issues
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary'
import './index.css';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
  </React.StrictMode>
)