import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import './App.css'

function App() {
  return (
    <Router basename="/tickets/">
      <Routes>
        <Route path="/" element={<DashboardPage />} />
      </Routes>
    </Router>
  )
}

export default App