import React, { useState, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import IPhoneShell from './components/IPhoneShell'
import DevShellController from './components/DevShellController'
import ErrorBoundary from './ErrorBoundary'
import SafeChakraProvider from './utils/SafeChakra'
import theme from './theme'
import ChakraProbe from './ChakraProbe'
import './index.css'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {new URLSearchParams(location.search).get('chakra_repro') === '1' ? (
        // load a module that imports Chakra at module scope to reproduce package init errors
        React.createElement(React.lazy(() => import('./_chakra_repro.jsx')))
      ) : new URLSearchParams(location.search).get('chakra_probe') === '1' ? (
        <ChakraProbe />
      ) : (
        <SafeChakraProvider theme={theme}>
          {import.meta.env.DEV ? (
            <DevShellWrapper>
              <App />
            </DevShellWrapper>
          ) : (
            <App />
          )}
        </SafeChakraProvider>
      )}
    </ErrorBoundary>
  </React.StrictMode>
)

// Dev-only wrapper to manage shell toggling
export function DevShellWrapper({ children }){
  const [state, setState] = useState({ enabled: true, device: 'iphone14' })
  const deviceWidths = { iphone14: 390, iphoneSE: 375, pixel: 393, ipad: 820 }
  const deviceWidth = deviceWidths[state.device] || 390
  // clone child and pass deviceWidth prop
  const childWithProps = React.isValidElement(children) ? React.cloneElement(children, { deviceWidth }) : children
  const handleChange = useCallback((s) => {
    // Only update state when values actually differ to avoid unnecessary renders
    setState(prev => {
      if (!prev) return s
      if (prev.enabled === s.enabled && prev.device === s.device) return prev
      return { enabled: !!s.enabled, device: s.device }
    })
  }, [])

  return (
    <>
      {state.enabled ? <IPhoneShell device={state.device}>{childWithProps}</IPhoneShell> : childWithProps}
      <DevShellController onChange={handleChange} />
    </>
  )
}

// register service worker if available
// register service worker only in production builds to avoid dev/preview caches
if ('serviceWorker' in navigator && !import.meta.env.DEV && !location.hostname.includes('localhost')) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    console.log('Service worker registered', reg)
    if (reg.waiting) { reg.waiting.postMessage('skipWaiting') }
    reg.addEventListener && reg.addEventListener('updatefound', () => {
      const nw = reg.installing
      nw && nw.addEventListener && nw.addEventListener('statechange', () => {
        console.log('sw state', nw.state)
      })
    })
  }).catch(() => { /* registration failed */ })
}