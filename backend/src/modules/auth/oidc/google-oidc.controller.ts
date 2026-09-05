import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ExchangeGoogleOidcSessionDto } from '../dto/exchange-google-oidc-session.dto';
import { SessionDto } from '../dto/session.dto';
import { GoogleOidcAuthenticationService } from './google-oidc-authentication.service';
import { GoogleOidcProtocolService } from './google-oidc-protocol.service';
import { GoogleOidcSessionHandoffService } from './google-oidc-session-handoff.service';
import type { OidcCallbackQuery } from './google-oidc-protocol.service';

@Controller('auth/google/oidc')
export class GoogleOidcController {
  constructor(
    private readonly protocol: GoogleOidcProtocolService,
    private readonly authentication: GoogleOidcAuthenticationService,
    private readonly sessionHandoff: GoogleOidcSessionHandoffService,
  ) {}

  @Get('authorize')
  async authorize(@Res() response: Response): Promise<void> {
    const request = await this.protocol.createAuthorizationRequest();
    response.cookie(
      request.correlationCookie.name,
      request.correlationCookie.value,
      request.correlationCookie.options,
    );
    response.redirect(request.authorizationUrl);
  }

  @Get('callback')
  async callback(
    @Query() query: OidcCallbackQuery,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const cookieName = this.protocol.correlationCookieName();
    const correlationCookie = readCookie(request.headers.cookie, cookieName);
    response.clearCookie(
      cookieName,
      this.protocol.correlationCookieClearOptions(),
    );
    try {
      const identity = await this.protocol.completeAuthorization(
        query,
        correlationCookie,
      );
      const session = await this.authentication.authenticate(identity);
      const handoff = await this.sessionHandoff.create(session);
      response.redirect(
        HttpStatus.SEE_OTHER,
        this.sessionHandoff.frontendSuccessRedirect(handoff),
      );
    } catch (error) {
      response.redirect(
        HttpStatus.SEE_OTHER,
        this.sessionHandoff.frontendErrorRedirect(error),
      );
    }
  }

  @Post('exchange')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: SessionDto })
  exchange(
    @Body() exchangeDto: ExchangeGoogleOidcSessionDto,
  ): Promise<SessionDto> {
    return this.sessionHandoff.consume(exchangeDto.handoff);
  }
}

function readCookie(
  header: string | undefined,
  name: string,
): string | undefined {
  if (!header) {
    return undefined;
  }
  for (const cookie of header.split(';')) {
    const separator = cookie.indexOf('=');
    if (separator === -1) {
      continue;
    }
    const cookieName = cookie.slice(0, separator).trim();
    if (cookieName === name) {
      try {
        return decodeURIComponent(cookie.slice(separator + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}
