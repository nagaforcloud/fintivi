import type { FastifyRequest } from 'fastify'

export function getUserId(request: FastifyRequest): string {
  return request.user.id
}

export function getUserMarket(request: FastifyRequest): string {
  return request.user.market
}
