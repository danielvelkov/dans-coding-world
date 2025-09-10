export interface JwtOptions {
  accessSecret: string;
  accessExpiration: number;
  refreshSecret: string;
  refreshExpiration: number;

}

export class JwtConfiguration {
  constructor(public options: JwtOptions) {}
}
