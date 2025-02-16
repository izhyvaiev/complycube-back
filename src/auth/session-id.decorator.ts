import type { ExecutionContext } from '@nestjs/common'
import { createParamDecorator } from '@nestjs/common'

export const SessionId = createParamDecorator((_data, ctx: ExecutionContext) => {
	const req = ctx.switchToHttp().getRequest()
	return req.sessionId
})
