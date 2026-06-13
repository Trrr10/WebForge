/**
 * api.js
 * Tiny fetch helper.
 *
 * Fixes the "Failed to execute 'json' on 'Response': Unexpected end of
 * JSON input" crash you were seeing. That error happens when res.json()
 * is called on a response with an EMPTY body (e.g. a 204, a backend that
 * isn't running and a proxy returns nothing, or a 500 with no JSON body).
 *
 * postJSON() reads the body as text first, only parses it if there's
 * something there, and always throws a clean Error so your try/catch
 * blocks get a real message instead of a crash.
 */

const API_BASE = import.meta.env.VITE_API_URL || ''

export async function postJSON(path, body) {
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (networkErr) {
    throw new Error(
      'Could not reach the server. Is the backend running and is VITE_API_URL set correctly?'
    )
  }

  const raw = await res.text()
  let data = {}
  if (raw) {
    try {
      data = JSON.parse(raw)
    } catch {
      // Body wasn't JSON (HTML error page, empty stream, etc.)
      data = {}
    }
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status} ${res.statusText || ''}).`.trim())
  }

  return data
}