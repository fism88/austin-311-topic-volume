import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ResultsTable from './ResultsTable'

const mockData = {
  year: 2024,
  total: 150,
  unique_types: 3,
  counts: [
    { type: 'Pothole Repair', count: 100 },
    { type: 'Graffiti Removal', count: 35 },
    { type: 'Noise Complaint', count: 15 },
  ],
}

describe('ResultsTable', () => {
  it('renders the year in heading', () => {
    render(<ResultsTable data={mockData} />)
    expect(screen.getByText('Results for 2024')).toBeInTheDocument()
  })

  it('renders "All Years" when year is null', () => {
    const dataWithoutYear = { ...mockData, year: null }
    render(<ResultsTable data={dataWithoutYear} />)
    expect(screen.getByText('Results for All Years')).toBeInTheDocument()
  })

  it('displays total count', () => {
    render(<ResultsTable data={mockData} />)
    expect(screen.getByText('150')).toBeInTheDocument()
  })

  it('displays unique types count', () => {
    render(<ResultsTable data={mockData} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders all service types in table', () => {
    render(<ResultsTable data={mockData} />)
    expect(screen.getByText('Pothole Repair')).toBeInTheDocument()
    expect(screen.getByText('Graffiti Removal')).toBeInTheDocument()
    expect(screen.getByText('Noise Complaint')).toBeInTheDocument()
  })

  it('renders counts for each type', () => {
    render(<ResultsTable data={mockData} />)
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('35')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('renders rank numbers', () => {
    render(<ResultsTable data={mockData} />)
    const cells = screen.getAllByRole('cell')
    // First row rank should be 1
    expect(cells[0]).toHaveTextContent('1')
  })

  it('renders table headers', () => {
    render(<ResultsTable data={mockData} />)
    expect(screen.getByText('#')).toBeInTheDocument()
    expect(screen.getByText('Count')).toBeInTheDocument()
    expect(screen.getByText('Service Request Type')).toBeInTheDocument()
  })

  it('renders filter input', () => {
    render(<ResultsTable data={mockData} />)
    expect(screen.getByPlaceholderText('Filter by type...')).toBeInTheDocument()
  })

  it('filters results when typing in filter input', () => {
    render(<ResultsTable data={mockData} />)
    const filterInput = screen.getByPlaceholderText('Filter by type...')

    fireEvent.change(filterInput, { target: { value: 'Pothole' } })

    expect(screen.getByText('Pothole Repair')).toBeInTheDocument()
    expect(screen.queryByText('Graffiti Removal')).not.toBeInTheDocument()
    expect(screen.queryByText('Noise Complaint')).not.toBeInTheDocument()
  })

  it('shows filter count when filtering', () => {
    render(<ResultsTable data={mockData} />)
    const filterInput = screen.getByPlaceholderText('Filter by type...')

    fireEvent.change(filterInput, { target: { value: 'Pothole' } })

    expect(screen.getByText('Showing 1 of 3')).toBeInTheDocument()
  })

  it('filter is case insensitive', () => {
    render(<ResultsTable data={mockData} />)
    const filterInput = screen.getByPlaceholderText('Filter by type...')

    fireEvent.change(filterInput, { target: { value: 'pothole' } })

    expect(screen.getByText('Pothole Repair')).toBeInTheDocument()
  })

  it('shows all results when filter is cleared', () => {
    render(<ResultsTable data={mockData} />)
    const filterInput = screen.getByPlaceholderText('Filter by type...')

    fireEvent.change(filterInput, { target: { value: 'Pothole' } })
    expect(screen.queryByText('Graffiti Removal')).not.toBeInTheDocument()

    fireEvent.change(filterInput, { target: { value: '' } })
    expect(screen.getByText('Graffiti Removal')).toBeInTheDocument()
  })

  it('handles empty counts array', () => {
    const emptyData = { ...mockData, counts: [], unique_types: 0, total: 0 }
    render(<ResultsTable data={emptyData} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('formats large numbers with locale string', () => {
    const largeData = {
      ...mockData,
      total: 1000000,
      counts: [{ type: 'Test', count: 500000 }],
    }
    render(<ResultsTable data={largeData} />)
    expect(screen.getByText('1,000,000')).toBeInTheDocument()
    expect(screen.getByText('500,000')).toBeInTheDocument()
  })
})
