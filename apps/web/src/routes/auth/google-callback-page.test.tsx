import { describe, expect, it } from 'vitest'
import { parseGoogleFragment } from './google-callback-page'

describe('parseGoogleFragment', () => {
  it('parses a valid Google callback fragment', () => {
    const hash = '#accessToken=at&refreshToken=rt&sessionId=sid&userId=uid&email=user%40example.com&market=global'

    const result = parseGoogleFragment(hash)

    expect(result).not.toBeNull()
    expect(result!.accessToken).toBe('at')
    expect(result!.refreshToken).toBe('rt')
    expect(result!.sessionId).toBe('sid')
    expect(result!.user.id).toBe('uid')
    expect(result!.user.email).toBe('user@example.com')
    expect(result!.user.market).toBe('global')
  })

  it('returns null when required fields are missing', () => {
    expect(parseGoogleFragment('#accessToken=at')).toBeNull()
  })

  it('handles india market', () => {
    const hash = '#accessToken=at&refreshToken=rt&sessionId=sid&userId=uid&market=india'

    const result = parseGoogleFragment(hash)

    expect(result).not.toBeNull()
    expect(result!.user.market).toBe('india')
    expect(result!.user.currency).toBe('INR')
  })
})
