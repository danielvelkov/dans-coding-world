// import { IUserRepository } from '@dans-coding-world/shared-data-access-interfaces';
// import {
//   Strategy as JwtStrategy,
//   ExtractJwt,
//   StrategyOptionsWithoutRequest,
//   VerifyCallback,
// } from 'passport-jwt';

// @Injectable()
// export class PassportJwtStrategy {
//   public readonly strategy: JwtStrategy;

//   constructor(
//     @Inject(USER_REPOSITORY_TOKEN) private userRepository: IUserRepository,
//     @Inject(AUTH_CONFIG_TOKEN) private authConfig: AuthConfiguration
//   ) {
//     const opts: StrategyOptionsWithoutRequest = {
//       jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//       secretOrKey: this.authConfig.options.accessSecret,
//     };

//     this.strategy = new JwtStrategy(opts, this.verify.bind(this));
//   }

//   private verify: VerifyCallback = async (jwt_payload, done) => {
//     try {
//       const user = await this.userRepository.getById(jwt_payload.sub);

//       if (user) {
//         return done(null, user);
//       } else {
//         return done(null, false);
//       }
//     } catch (error) {
//       console.error('JWT Strategy verification error:', error);
//       return done(error, false);
//     }
//   };
// }
