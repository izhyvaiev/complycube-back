import { AsyncLocalStorage } from 'async_hooks'
import type { Request } from 'express'
export const requestAsyncLocalStorage = new AsyncLocalStorage<Request>()
