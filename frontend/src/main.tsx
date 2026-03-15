import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0f1420',
            color: '#e8edf8',
            border: '1px solid #1c2540',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#4ade80', secondary: '#0f1420' } },
          error:   { iconTheme: { primary: '#f87171', secondary: '#0f1420' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
