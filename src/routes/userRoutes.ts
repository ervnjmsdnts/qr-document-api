import { Router } from 'express';
import prisma from '../utils/prisma';
import { TypedRequestBody } from '../types';

interface ChangePasswordRequestSchema {
  userId: string;
  newPassword: string;
}

const userRouter = Router();

userRouter.post(
  '/change-password-request',
  async (req: TypedRequestBody<ChangePasswordRequestSchema>, res) => {
    try {
      const { userId, newPassword } = req.body;
      const user = await prisma.user.findFirst({ where: { id: userId } });

      if (!user || user.role === 'ADMIN') {
        return res
          .status(404)
          .json({ error: 'User not found or unauthorized' });
      }

      if (!newPassword) {
        return res.status(404).json({ error: 'Invalid for new password' });
      }

      await prisma.requestPasswordChange.create({
        data: { userId, newPassword },
      });

      return res
        .status(200)
        .json({ message: 'Password change request sent to Admin' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to process request' });
    }
  },
);

export default userRouter;
