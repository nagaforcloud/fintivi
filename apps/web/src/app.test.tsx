import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './app'

describe('App', () => {
  it('renders the login screen for unauthenticated users', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
  })
})
