import { Body, Controller, Get, NotFoundException, Post, Put } from '@nestjs/common';
import { SessionId } from '@app/auth/session-id.decorator';
import { VerificationService } from '@app/verification/verification.service';
import { IndividualClientPayloadDto } from '@app/complycube-shared/verification/individual-client-payload.dto';
import { ApiCreatedResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IndividualClientDto } from '@app/complycube-shared/verification/individual-client.dto';
import { Public } from '@app/auth/public.decorator';
import { SessionTokenDto } from '@app/complycube-shared/auth/session-token.dto';
import { plainToInstance } from 'class-transformer';

@ApiTags('verification')
@ApiResponse({ status: 400, description: 'Invalid request' })
@ApiResponse({ status: 403, description: 'Forbidden request' })
@ApiResponse({ status: 500, description: 'Internal server error' })
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @ApiResponse({ type: IndividualClientDto })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @Get('session')
  async getSessionClient(@SessionId() sessionId: string) {
    const session = await this.verificationService.getSessionClient(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  @ApiResponse({ type: IndividualClientDto })
  @Put('session')
  async setSession(
    @SessionId() sessionId: string,
    @Body() payload: IndividualClientPayloadDto
  ) {
    return this.verificationService.setSessionClientData(sessionId, payload);
  }

  @Public()
  @Post('session/token')
  @ApiCreatedResponse({ type: SessionTokenDto })
  async createSessionToken(@SessionId() sessionId: string): Promise<SessionTokenDto> {
    const token = await this.verificationService.generateSessionToken(sessionId)
    return plainToInstance(SessionTokenDto, token)
  }
}