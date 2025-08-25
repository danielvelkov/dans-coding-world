import jwt from 'jsonwebtoken';
import { validPassword } from '@dans-coding-world/util-auth';
import { client } from '@dans-coding-world/user-data-access';
import { Request, Response } from 'express';

// Login route for generating JWT
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await client.get({ email });

  if (!user)
    return res.status(401).json({ message: 'No such user/email found' });

  const isPasswordValid = await validPassword(password, user.password);

  if (isPasswordValid) {
    const payload = { sub: user.id };

    const token = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET ?? '', {
      expiresIn: '1d',
    });
    return res.json({ message: 'Login successful', token });
  } else {
    return res.status(401).json({ message: 'Passwords did not match' });
  }
};
