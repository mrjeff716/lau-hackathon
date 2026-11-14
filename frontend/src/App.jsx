// =============================================================================
// App.jsx — decides which page to show for each URL.
// Right now there is one page ("/" -> HomePage). Add more <Route>s here later,
// e.g. a physio dashboard at "/physio".
// =============================================================================

import { Route, Routes } from 'react-router'
import HomePage from './pages/HomePage'

const App = () => {
  return (
    <div>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </div>
  )
}

export default App
