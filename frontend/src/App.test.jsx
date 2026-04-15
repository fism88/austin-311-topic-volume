import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders the title', () => {
    render(<App />)
    expect(screen.getByText('Austin 311 Service Requests')).toBeInTheDocument()
  })

  it('renders the year input with current year as default', () => {
    render(<App />)
    const input = screen.getByLabelText('Year:')
    expect(input).toBeInTheDocument()
    expect(input.value).toBe(String(new Date().getFullYear()))
  })

  it('renders the fetch button', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Fetch Data' })).toBeInTheDocument()
  })

  it('allows changing the year', () => {
    render(<App />)
    const input = screen.getByLabelText('Year:')
    fireEvent.change(input, { target: { value: '2020' } })
    expect(input.value).toBe('2020')
  })

  it('shows loading state when fetching', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Fetch Data' }))

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.getByText(/Fetching data from Austin Open Data/)).toBeInTheDocument()
  })

  it('displays results after successful fetch', async () => {
    const mockData = {
      year: 2024,
      total: 100,
      unique_types: 5,
      counts: [
        { type: 'Pothole', count: 50 },
        { type: 'Graffiti', count: 30 },
      ],
    }

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Fetch Data' }))

    await waitFor(() => {
      expect(screen.getByText('Results for 2024')).toBeInTheDocument()
    })

    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('Pothole')).toBeInTheDocument()
  })

  it('displays error message on fetch failure', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    })

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Fetch Data' }))

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument()
    })
  })

  it('displays error when API returns error object', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ error: 'API Error' }),
    })

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Fetch Data' }))

    await waitFor(() => {
      expect(screen.getByText('Error: API Error')).toBeInTheDocument()
    })
  })

  it('disables button while loading', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(
      () => new Promise(() => {})
    )

    render(<App />)
    const button = screen.getByRole('button', { name: 'Fetch Data' })
    fireEvent.click(button)

    expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled()
  })
})
