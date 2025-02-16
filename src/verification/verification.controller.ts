import { Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { SessionId } from '@app/auth/session-id.decorator';
import { VerificationService } from '@app/verification/verification.service';
import { IndividualClientPayloadDto } from '@app/complycube-shared/verification/individual-client-payload.dto';
import { ApiCreatedResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IndividualClientDto } from '@app/complycube-shared/verification/individual-client.dto';
import { SessionTokenDto } from '@app/complycube-shared/auth/session-token.dto';
import { CapturePayloadDto } from '@app/complycube-shared/verification/capture-payload.dto';
import { VerificationStatusDto } from '@app/complycube-shared/verification/verification-status.dto';
import { fillDto } from '@app/helpers';

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

  @Post('session/token')
  @ApiCreatedResponse({ type: SessionTokenDto })
  async createSessionToken(@SessionId() sessionId: string): Promise<SessionTokenDto> {
    const token = await this.verificationService.generateSessionToken(sessionId)
    return fillDto(SessionTokenDto, { token, sessionId })
  }

  @Post('capture')
  @ApiCreatedResponse({ type: VerificationStatusDto, isArray: true })
  async verifyCapturedData(
    @SessionId() sessionId: string,
    @Body() payload: CapturePayloadDto
  ): Promise<VerificationStatusDto[]> {
    const verifications = await this.verificationService
      .initVerificationOfCapture(sessionId, payload);
    return verifications.map(verification => fillDto(
      VerificationStatusDto,
      verification.get({ plain: true })
    ))
  }

  @Get('capture')
  @ApiCreatedResponse({ type: VerificationStatusDto, isArray: true })
  async getCaptures(@SessionId() sessionId: string,): Promise<VerificationStatusDto[]> {
    const verifications = await this.verificationService
      .getVerificationsBySessionId(sessionId);
    return verifications.map(verification => fillDto(
      VerificationStatusDto,
      verification.get({ plain: true })
    ))
  }

  @Get('capture/:id')
  @ApiCreatedResponse({ type: VerificationStatusDto })
  async getCapture(
    @SessionId() sessionId: string,
    @Param('id', ParseIntPipe) id: number
  ): Promise<VerificationStatusDto> {
    const verification = await this.verificationService
      .getVerification(sessionId, id);
    return fillDto(
      VerificationStatusDto,
      verification.get({ plain: true })
    )
  }

  @Put('capture/:id/check')
  @ApiCreatedResponse({ type: VerificationStatusDto })
  async checkCapture(
    @SessionId() sessionId: string,
    @Param('id', ParseIntPipe) id: number
  ): Promise<VerificationStatusDto> {
    const verification = await this.verificationService
      .checkVerificationStatus(sessionId, id);
    return fillDto(
      VerificationStatusDto,
      verification.get({ plain: true })
    )
  }
}