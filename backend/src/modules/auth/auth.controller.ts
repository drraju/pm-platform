import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthMeDto } from './dto/auth-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangePasswordResponseDto } from './dto/change-password-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { PasswordResetResponseDto } from './dto/password-reset-response.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
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

  @Post('forgot-password')
  @ApiOkResponse({ type: PasswordResetResponseDto })
  requestPasswordReset(
    @Req() request: Request,
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<PasswordResetResponseDto> {
    return this.authService.requestPasswordReset(forgotPasswordDto, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
  }

  @Post('reset-password')
  @ApiOkResponse({ type: PasswordResetResponseDto })
  @ApiBadRequestResponse({ description: 'Password reset failed' })
  resetPassword(
    @Req() request: Request,
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<PasswordResetResponseDto> {
    return this.authService.resetPassword(resetPasswordDto, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: AuthMeDto })
  getMe(@Req() request: AuthenticatedRequest): Promise<AuthMeDto> {
    return this.authService.getMe(request.user.userId);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: ChangePasswordResponseDto })
  @ApiBadRequestResponse({ description: 'Password validation failed' })
  @ApiUnauthorizedResponse({ description: 'Unable to change password' })
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<ChangePasswordResponseDto> {
    return this.authService.changePassword(
      request.user.userId,
      changePasswordDto,
      {
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      },
    );
  }
}
