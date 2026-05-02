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
      const params = new URLSearchParams({
        '$select': 'sr_type_desc, count(*) as count',
        '$group': 'sr_type_desc',
        '$order': 'count DESC',
        '$limit': '50000',
        '$where': `sr_created_date >= '${year}-01-01' AND sr_created_date < '${Number(year) + 1}-01-01'`,
      })
      const response = await fetch(
        `https://data.austintexas.gov/resource/xwdj-i9he.json?${params}`
      )
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }
      const rows = await response.json()
      const counts = rows.map((row) => ({
        type: row.sr_type_desc || 'Unknown',
        count: parseInt(row.count, 10),
      }))
      setData({
        year: Number(year),
        total: counts.reduce((sum, r) => sum + r.count, 0),
        unique_types: counts.length,
        counts,
      })
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
