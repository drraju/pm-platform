import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthMeDto } from './dto/auth-me.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SessionDto } from './dto/session.dto';
import { AuthService } from './auth.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    email: string;
    roleId: string;
  };
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: AuthMeDto })
  getMe(@Req() request: AuthenticatedRequest): Promise<AuthMeDto> {
    return this.authService.getMe(request.user.userId);
  }
}
