import { useState } from 'react'

function ResultsTable({ data }) {
  const [filter, setFilter] = useState('')

  const filteredCounts = data.counts.filter((item) =>
    item.type.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="results">
      <div className="summary">
        <h2>Results for {data.year || 'All Years'}</h2>
        <p>
          <strong>{data.total.toLocaleString()}</strong> total records |{' '}
          <strong>{data.unique_types}</strong> unique service types
        </p>
      </div>

      <div className="filter-row">
        <input
          type="text"
          placeholder="Filter by type..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-input"
        />
        {filter && (
          <span className="filter-count">
            Showing {filteredCounts.length} of {data.counts.length}
          </span>
        )}
      </div>

      <table>
        <thead>
          <tr>
            <th className="rank">#</th>
            <th className="count">Count</th>
            <th className="type">Service Request Type</th>
          </tr>
        </thead>
        <tbody>
          {filteredCounts.map((item, index) => (
            <tr key={item.type}>
              <td className="rank">{index + 1}</td>
              <td className="count">{item.count.toLocaleString()}</td>
              <td className="type">{item.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ResultsTable
