import { Router } from 'express';
import { TypedRequestBody } from '../types';
import prisma from '../utils/prisma';

const authRouter = Router();

interface LoginSchema {
  username: string;
  password: string;
}

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
