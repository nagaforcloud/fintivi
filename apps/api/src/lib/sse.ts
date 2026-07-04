import type { FastifyReply } from 'fastify'
import { EventEmitter } from 'events'
import type { Db } from '@fintivi/db/client'
import { getJobEvents } from './jobs'

const jobEmitters = new Map<string, EventEmitter>()
const userStreamCounts = new Map<string, number>()

export function getJobEmitter(jobId: string): EventEmitter {
  let emitter = jobEmitters.get(jobId)
  if (!emitter) {
    emitter = new EventEmitter()
    emitter.setMaxListeners(100)
    jobEmitters.set(jobId, emitter)
    emitter.once('end', () => {
      jobEmitters.delete(jobId)
    })
  }
  return emitter
}

export function incrementUserStreams(userId: string): number {
  const count = (userStreamCounts.get(userId) ?? 0) + 1
  userStreamCounts.set(userId, count)
  return count
}

export function decrementUserStreams(userId: string): number {
  const count = Math.max(0, (userStreamCounts.get(userId) ?? 0) - 1)
  if (count === 0) {
    userStreamCounts.delete(userId)
  } else {
    userStreamCounts.set(userId, count)
  }
  return count
}

export function getUserStreamCount(userId: string): number {
  return userStreamCounts.get(userId) ?? 0
}

export function createSSEStream(
  reply: FastifyReply,
  onClose: () => void,
): { send: (event: string, data?: unknown) => void; close: () => void } {
  const raw = reply.raw
  raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  raw.flushHeaders()

  raw.on('close', () => {
    onClose()
  })

  return {
    send(event: string, data?: unknown) {
      if (raw.destroyed) return
      const payload = data !== undefined ? JSON.stringify(data) : ''
      raw.write(`event: ${event}\ndata: ${payload}\n\n`)
    },
    close() {
      if (!raw.destroyed) {
        raw.end()
      }
    },
  }
}

export async function replayJobEvents(
  db: Db,
  stream: { send: (event: string, data?: unknown) => void },
  jobId: string,
): Promise<void> {
  const events = await getJobEvents(db, jobId)
  for (const event of events) {
    stream.send('progress', {
      stage: event.stage,
      percent: event.percent,
      message: event.message,
      createdAt: event.createdAt,
    })
  }
}
