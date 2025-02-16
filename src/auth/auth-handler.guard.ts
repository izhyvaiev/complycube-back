import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PUBLIC } from '@app/auth/constants'
import type { Request } from 'express'
import { JwtService } from '@nestjs/jwt'
import type { JWTPayload } from '@app/auth/types'

@Injectable()
export class AuthHandlerGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly jwtService: JwtService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const handler = context.getHandler()
		const request = context.switchToHttp().getRequest<Request>()
		const isPublic = this.reflector.get<boolean>(PUBLIC, handler)

		if (isPublic) {
			return true
		} else {
			return this.validateJwt(request)
		}
	}

	private async validateJwt(request: Request) {
		const token = this.getBearerToken(request)
		let payload: JWTPayload
		try {
			payload = await this.jwtService.verifyAsync<JWTPayload>(token)
		} catch (error) {
			throw new UnauthorizedException(error.message || error)
		}

		request.sessionId = payload.sessionId

		return true
	}

	private getBearerToken(request: Request) {
		const authorization = request.header('authorization')
		if (!authorization) {
			throw new UnauthorizedException('No authorization header')
		}
		const [type, token] = authorization.split(' ')
		if (type.toLowerCase() !== 'bearer') {
			throw new UnauthorizedException('Unsupported authorization scheme')
		}
		return token
	}
}
