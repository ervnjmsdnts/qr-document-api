import { Router } from 'express';
import { TypedRequestBody } from '../types';
import prisma from '../utils/prisma';
import { UserRole } from '@prisma/client';

const authRouter = Router();

interface SignUpSchema {
  username: string;
  name: string;
  contactNumber: string;
  role: UserRole;
  department: string;
}

interface LoginSchema {
  username: string;
  password: string;
}

function generatePassword(length: number) {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
  let password = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }

  return password;
}

authRouter.post(
  '/sign-up',
  async (req: TypedRequestBody<SignUpSchema>, res) => {
    try {
      const userExist = await prisma.user.findFirst({
        where: { username: req.body.username },
      });
      if (userExist) {
        return res
          .status(404)
          .json({ message: 'User with that username already exists' });
      }

      await prisma.user.create({
        data: { ...req.body, password: generatePassword(10) },
      });

      return res.status(201).json({ message: 'User created' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to create user' });
    }
  },
);

authRouter.post('/login', async (req: TypedRequestBody<LoginSchema>, res) => {
  try {
    const userExist = await prisma.user.findFirst({
      where: { username: req.body.username },
    });
    if (!userExist) {
      return res.status(404).json({ message: 'User does not exist' });
    }

    if (userExist.password !== req.body.password) {
      return res.status(404).json({ message: 'User credentials invalid' });
    }

    return res.status(200).json(userExist);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to login user' });
  }
});

export default authRouter;
