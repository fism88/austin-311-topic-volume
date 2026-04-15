import { useState } from 'react'
import ResultsTable from './components/ResultsTable'

function App() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setData(null)

    try {
      const response = await fetch(`/api/counts?year=${year}`)
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }
      const result = await response.json()
      if (result.error) {
        throw new Error(result.error)
      }
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>Austin 311 Service Requests</h1>

      <form onSubmit={fetchData} className="form">
        <label htmlFor="year">Year:</label>
        <input
          type="number"
          id="year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          min="2014"
          max={new Date().getFullYear()}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Fetch Data'}
        </button>
      </form>

      {loading && (
        <div className="loading">
          <p>Fetching data from Austin Open Data portal...</p>
          <p className="loading-note">This may take a minute for large datasets.</p>
        </div>
      )}

      {error && (
        <div className="error">
          <p>Error: {error}</p>
        </div>
      )}

      {data && <ResultsTable data={data} />}
    </div>
  )
}

export default App
