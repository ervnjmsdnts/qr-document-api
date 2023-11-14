import { Router } from 'express';
import { TypedRequestBody } from '../types';
import prisma from '../utils/prisma';
import { RequestPasswordChangeStatus } from '@prisma/client';

interface AdminChangeRequestSchema {
  requestId: string;
  action: RequestPasswordChangeStatus;
}

const adminRouter = Router();

adminRouter.get('/get-change-requests', async (_, res) => {
  try {
    const changeRequests = await prisma.requestPasswordChange.findMany();

    return res.status(200).json(changeRequests);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to get change requests' });
  }
});

adminRouter.post(
  '/change-request-action',
  async (req: TypedRequestBody<AdminChangeRequestSchema>, res) => {
    try {
      const { requestId, action } = req.body;
      const request = await prisma.requestPasswordChange.findFirst({
        where: { id: requestId, status: 'PENDING' },
      });

      if (!request) {
        return res
          .status(404)
          .json({ error: 'Request not found or already processed.' });
      }

      if (action === 'APPROVED') {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: request.userId },
            data: { password: request.newPassword },
          }),
          prisma.requestPasswordChange.update({
            where: { id: requestId },
            data: { status: 'APPROVED' },
          }),
        ]);

        return res
          .status(200)
          .json({ message: 'Password changed successfully' });
      } else if (action === 'REJECTED') {
        await prisma.requestPasswordChange.update({
          where: { id: requestId },
          data: { status: 'REJECTED' },
        });

        return res
          .status(200)
          .json({ message: 'Password change request rejected' });
      } else {
        return res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to process request' });
    }
  },
);

export default adminRouter;
