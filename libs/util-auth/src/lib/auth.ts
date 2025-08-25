import { NextFunction, Request, Response } from 'express';
import { User } from '@dans-coding-world/prisma-schema';
import passport from 'passport';

/**
 * Sets the `req.user` if JWT Header Authentication is valid.
 * @example
 * ```typescript
 *  app.get('/blogs', attachUserIfLoggedIn, (req: Request, res: Response) => {
 *    if(!req.user)
 *      res.send(db.blogs.findMany({where: {membersOnly: false} }));
 *    // ...
 *  })
 * ```
 */
export const attachUserIfLoggedIn = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  passport.authenticate(
    'jwt',
    { session: false },
    (error: Error, user: User) => {
      if (error) return next(error);
      else if (user) req.user = user;
      next();
    }
  )(req, res, next);
};

/**
 * Makes sure JWT Header Authentication is valid.
 * Sends HTTP Status 403 Forbidden otherwise.
 *
 * Sets `req.user` after validation.
 * @example
 * ```typescript
 *  app.get('/profile', ensureUserLoggedIn, (req: Request, res: Response) => {
 *      res.send(db.users.findFirst({where: {id: req.user.id} }));
 *    // ...
 *  })
 * ```
 */
export const ensureUserLoggedIn = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  passport.authenticate(
    'jwt',
    { session: false },
    (error: Error, user: User) => {
      if (error) return next(error);
      if (!user) return res.sendStatus(403);

      req.user = user;
      next();
    }
  )(req, res, next);
};
