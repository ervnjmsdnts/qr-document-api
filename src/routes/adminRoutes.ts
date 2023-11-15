import { Router } from 'express';
import { TypedRequestBody } from '../types';
import prisma from '../utils/prisma';
import {
  Department,
  RequestPasswordChangeStatus,
  UserRole,
} from '@prisma/client';
import cloudinary from '../utils/cloudinary';

interface AdminChangeRequestSchema {
  requestId: string;
  action: RequestPasswordChangeStatus;
}

interface SignUpSchema {
  username: string;
  name: string;
  contactNumber: string;
  role: UserRole;
  department: Department;
}

interface UserIdSchema {
  userId: string;
}

interface AttachImageSchema {
  image: string;
  documentId: string;
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

adminRouter.delete(
  '/delete-user',
  async (req: TypedRequestBody<UserIdSchema>, res) => {
    try {
      const { userId } = req.body;
      const userExist = await prisma.user.findFirst({ where: { id: userId } });

      if (!userExist) {
        return res.status(404).json({ error: 'User not found' });
      }

      await prisma.user.delete({ where: { id: userId } });

      return res.status(200).json({ message: 'User deleted' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to delete user' });
    }
  },
);

adminRouter.put(
  '/disable-user',
  async (req: TypedRequestBody<UserIdSchema>, res) => {
    try {
      const { userId } = req.body;
      const userExist = await prisma.user.findFirst({ where: { id: userId } });

      if (!userExist || !userExist.isActive) {
        return res
          .status(404)
          .json({ error: 'User not found or user already disabled' });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      return res.status(200).json({ message: 'User disabled' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to update user status' });
    }
  },
);

adminRouter.put(
  '/enable-user',
  async (req: TypedRequestBody<UserIdSchema>, res) => {
    try {
      const { userId } = req.body;
      const userExist = await prisma.user.findFirst({ where: { id: userId } });

      if (!userExist || userExist.isActive) {
        return res
          .status(404)
          .json({ error: 'User not found or user already enabled' });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { isActive: true },
      });

      return res.status(200).json({ message: 'User enabled' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to update user status' });
    }
  },
);

adminRouter.get('/get-users', async (_, res) => {
  try {
    const users = await prisma.user.findMany();

    return res.status(200).json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to get users' });
  }
});

adminRouter.post(
  '/create-user',
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

adminRouter.post(
  '/attach-image',
  async (req: TypedRequestBody<AttachImageSchema>, res) => {
    try {
      const { documentId, image } = req.body;
      const document = await prisma.document.findFirst({
        where: { id: documentId },
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const cloudinaryResponse = await cloudinary.uploader.upload(image);

      await prisma.document.update({
        where: { id: document.id },
        data: { image: cloudinaryResponse.url },
      });

      return res.status(200).json({ message: 'Image added to document' });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Failed to attach image to document' });
    }
  },
);

adminRouter.get(
  'get-user',
  async (req: TypedRequestBody<{ userId: string }>, res) => {
    try {
      const user = await prisma.user.findFirst({
        where: { id: req.body.userId },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json(user);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to get user' });
    }
  },
);

export default adminRouter;
