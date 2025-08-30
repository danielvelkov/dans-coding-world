import jwt from 'jsonwebtoken';
import { validPassword } from '@dans-coding-world/shared-util-auth';
import { client } from '@dans-coding-world/user-data-access';
import { NextFunction, Request, Response } from 'express';
import { ApiException } from '@dans-coding-world/exceptions';
import { ERROR_CODES } from '@dans-coding-world/shared-constants';

// Login route for generating JWT
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password } = req.body;
  const user = await client.get({ email });

  if (!user)
    return next(new ApiException(ERROR_CODES.AUTH.INVALID_CREDENTIALS));

  const isPasswordValid = await validPassword(password, user.password);

  if (isPasswordValid) {
    const payload = { sub: user.id };

    const token = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET ?? '', {
      expiresIn: '1d',
    });
    return res.json({ message: 'Login successful', token });
  } else {
    return next(new ApiException(ERROR_CODES.AUTH.INVALID_PASSWORD));
  }
};
