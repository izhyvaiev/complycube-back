import { ApiCreatedResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '@app/auth/public.decorator';
import { SessionResponseDto } from '@app/complycube-shared/auth/session-response.dto';
import { AuthService } from '@app/auth/auth.service';
import { RefreshTokenDto } from '@app/complycube-shared/auth/refresh-token.dto';

@ApiTags('authorization')
@ApiResponse({ status: 400, description: 'Invalid request' })
@ApiResponse({ status: 403, description: 'Forbidden request' })
@ApiResponse({ status: 500, description: 'Internal server error' })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('session')
  @ApiCreatedResponse({ type: SessionResponseDto })
  createSession(): Promise<SessionResponseDto> {
    return this.authService.generateSession()
  }

  @Public()
  @Post('refresh')
  @ApiCreatedResponse({ type: SessionResponseDto })
  login(@Body() payload: RefreshTokenDto): Promise<SessionResponseDto> {
    return this.authService.refreshToken(payload)
  }
}