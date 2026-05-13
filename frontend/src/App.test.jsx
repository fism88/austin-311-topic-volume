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

  it('renders zip code input with empty default', () => {
    render(<App />)
    const input = screen.getByLabelText(/Zip Code/)
    expect(input).toBeInTheDocument()
    expect(input.value).toBe('')
  })

  it('allows changing the zip code', () => {
    render(<App />)
    const input = screen.getByLabelText(/Zip Code/)
    fireEvent.change(input, { target: { value: '78701' } })
    expect(input.value).toBe('78701')
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
    const mockRows = [
      { sr_type_desc: 'Pothole', count: '50' },
      { sr_type_desc: 'Graffiti', count: '30' },
    ]

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRows),
    })

    render(<App />)
    const input = screen.getByLabelText('Year:')
    fireEvent.change(input, { target: { value: '2024' } })
    fireEvent.click(screen.getByRole('button', { name: 'Fetch Data' }))

    await waitFor(() => {
      expect(screen.getByText('Results for 2024')).toBeInTheDocument()
    })

    expect(screen.getByText('Pothole')).toBeInTheDocument()
    expect(screen.getByText('Graffiti')).toBeInTheDocument()
  })

  it('includes zip code in fetch URL when provided', async () => {
    let capturedUrl = ''
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      capturedUrl = url
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    })

    render(<App />)
    fireEvent.change(screen.getByLabelText('Year:'), { target: { value: '2024' } })
    fireEvent.change(screen.getByLabelText(/Zip Code/), { target: { value: '78701' } })
    fireEvent.click(screen.getByRole('button', { name: 'Fetch Data' }))

    await waitFor(() => expect(capturedUrl).not.toBe(''))
    expect(capturedUrl).toContain('sr_location_zip_code')
    expect(capturedUrl).toContain('78701')
  })

  it('omits zip code from fetch URL when not provided', async () => {
    let capturedUrl = ''
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      capturedUrl = url
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    })

    render(<App />)
    fireEvent.change(screen.getByLabelText('Year:'), { target: { value: '2024' } })
    fireEvent.click(screen.getByRole('button', { name: 'Fetch Data' }))

    await waitFor(() => expect(capturedUrl).not.toBe(''))
    expect(capturedUrl).not.toContain('sr_location_zip_code')
  })

  it('displays zip code in results heading when provided', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ sr_type_desc: 'Pothole', count: '10' }]),
    })

    render(<App />)
    fireEvent.change(screen.getByLabelText('Year:'), { target: { value: '2024' } })
    fireEvent.change(screen.getByLabelText(/Zip Code/), { target: { value: '78701' } })
    fireEvent.click(screen.getByRole('button', { name: 'Fetch Data' }))

    await waitFor(() => {
      expect(screen.getByText('Results for 2024 in 78701')).toBeInTheDocument()
    })
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
