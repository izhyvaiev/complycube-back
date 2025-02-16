import type { NestMiddleware } from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { requestAsyncLocalStorage } from '@app/auth/request.storage'

@Injectable()
export class RequestStoreMiddleware implements NestMiddleware {
	use(request: Request, response: Response, next: NextFunction) {
		requestAsyncLocalStorage.run(request, () => {
			next()
		})
	}
}
