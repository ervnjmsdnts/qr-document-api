import { Router } from 'express';
import prisma from '../utils/prisma';
import { TypedRequestBody } from '../types';
import { Department, UserRole } from '@prisma/client';

interface ChangePasswordRequestSchema {
  userId: string;
  newPassword: string;
}

const userRouter = Router();

interface ScanQRSchema {
  documentId: string;
  userDepartment: Department;
  userRole: UserRole;
}

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

userRouter.post(
  '/scan-qr',
  async (req: TypedRequestBody<ScanQRSchema>, res) => {
    try {
      const { documentId, userDepartment } = req.body;
      const document = await prisma.document.findFirst({
        where: { id: documentId },
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      if (document.type === 'PURCHASE_REQUEST') {
        const departmentSequence: Department[] = [
          'BO',
          'MENRO',
          'DRRMO',
          'AIASO',
        ];
      } else {
        return res.status(404).json({ error: 'Unknown document type' });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Filed to scan QR code' });
    }
  },
);

export default userRouter;
