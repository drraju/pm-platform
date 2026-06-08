import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import {
  AuthorizationService,
  AuthenticatedPrincipal,
} from '../authorization/authorization.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthProfileDto } from './dto/auth-profile.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SessionDto } from './dto/session.dto';
import { AuthService } from './auth.service';

type AuthenticatedRequest = Request & {
  user: AuthenticatedPrincipal;
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  @Post('register')
  @ApiCreatedResponse({ type: SessionDto })
  register(@Body() registerDto: RegisterDto): Promise<SessionDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOkResponse({ type: SessionDto })
  login(@Body() loginDto: LoginDto): Promise<SessionDto> {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: AuthProfileDto })
  async me(@Req() request: AuthenticatedRequest): Promise<AuthProfileDto> {
    return this.authorizationService.getEffectiveUser(request.user.userId);
  }
}
