import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'supersecret',
    });
  }

  async validate(payload: any) {
    // This object is what gets attached to "req.user"
    return {
      id: payload.sub, // I suggest using 'id' to match your Service logic
      orgId: payload.orgId, // <--- ADD THIS LINE
      email: payload.email,
      role: payload.role,
      name: payload.name,
    };
  }
}
