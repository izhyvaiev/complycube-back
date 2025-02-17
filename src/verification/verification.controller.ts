import { Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Put,
  Sse, MessageEvent } from '@nestjs/common';
import { SessionId } from '@app/auth/session-id.decorator';
import { VerificationService } from '@app/verification/verification.service';
import { IndividualClientPayloadDto } from '@app/complycube-shared/verification/individual-client-payload.dto';
import { ApiCreatedResponse, ApiExcludeEndpoint, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IndividualClientDto } from '@app/complycube-shared/verification/individual-client.dto';
import { SessionTokenDto } from '@app/complycube-shared/auth/session-token.dto';
import { CapturePayloadDto } from '@app/complycube-shared/verification/capture-payload.dto';
import { VerificationStatusDto } from '@app/complycube-shared/verification/verification-status.dto';
import { fillDto } from '@app/helpers';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Public } from '@app/auth/public.decorator';
import { Webhook } from '@complycube/api';

@ApiTags('verification')
@ApiResponse({ status: 400, description: 'Invalid request' })
@ApiResponse({ status: 403, description: 'Forbidden request' })
@ApiResponse({ status: 500, description: 'Internal server error' })
@Controller('verification')
export class VerificationController {
  private eventSubjects: Map<string, Subject<VerificationStatusDto>> = new Map()
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
      {
        ...verification.get({ plain: true }),
        sessionId,
      }
    ))
  }

  @Get('capture')
  @ApiCreatedResponse({ type: VerificationStatusDto, isArray: true })
  async getCaptures(@SessionId() sessionId: string,): Promise<VerificationStatusDto[]> {
    const verifications = await this.verificationService
      .getVerificationsBySessionId(sessionId);
    return verifications.map(verification => fillDto(
      VerificationStatusDto,
      {
        ...verification.get({ plain: true }),
        sessionId,
      }
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
      {
        ...verification.get({ plain: true }),
        sessionId
      }
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
      {
        ...verification.get({ plain: true }),
        sessionId
      }
    )
  }

  @Sse('sse')
  sse(@SessionId() sessionId: string,): Observable<MessageEvent> {
    if (!this.eventSubjects.has(sessionId)) {
      this.eventSubjects.set(sessionId, new Subject<VerificationStatusDto>())
    }
    return this.eventSubjects.get(sessionId).pipe(
      map((data) => ({
        data,
        type: 'update',
      })),
    );
  }

  @ApiExcludeEndpoint()
  @Public()
  @Post('webhook')
  async processWebhook(@Body() payload: {
    id: string,
    type: string,
    payload: {
      id: string
    }
  }): Promise<void> {
    const verification = await this.verificationService
      .getOneWithSession(payload.payload.id);
    if (verification) {
      const sessionId = verification.verificationSession!.uuid
      const verificationStatus = await this.checkCapture(
        sessionId,
        verification.id
      )
      const subject = this.eventSubjects.get(sessionId)
      subject?.next(verificationStatus)
    }
  }
}