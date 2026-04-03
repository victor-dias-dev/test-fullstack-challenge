import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { Request } from "express";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(): ReturnType<typeof createRemoteJWKSet> {
  if (!jwks) {
    const jwksUri =
      process.env.KEYCLOAK_JWKS_URI ??
      "http://keycloak:8080/realms/crash-game/protocol/openid-connect/certs";
    jwks = createRemoteJWKSet(new URL(jwksUri));
  }
  return jwks;
}

export interface JwtPayload {
  sub: string;
  preferred_username: string;
  email?: string;
  realm_access?: { roles: string[] };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Missing authorization token");
    }

    try {
      const { payload } = await jwtVerify<JwtPayload>(token, getJwks(), {
        issuer:
          process.env.KEYCLOAK_ISSUER ??
          "http://keycloak:8080/realms/crash-game",
      });

      (request as Request & { user: JwtPayload }).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  private extractToken(request: Request): string | null {
    const auth = request.headers["authorization"];
    if (!auth || !auth.startsWith("Bearer ")) return null;
    return auth.slice(7);
  }
}
