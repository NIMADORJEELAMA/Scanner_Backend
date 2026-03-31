import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: any) {
    // We take the orgId from the person who is logged in (the Admin)
    const orgId = req.user.orgId;
    return this.authService.register(dto, orgId);
  }
  @Post('onboard')
  onboard(@Body() dto: any) {
    // This creates the Organization and the first Admin User in one transaction
    return this.authService.onboardStore(dto);
  }
}
