import { Router } from 'express';
import prisma from '../utils/prisma';
import { TypedRequestBody } from '../types';
import { Department, UserRole, Document } from '@prisma/client';
import cloudinary from '../utils/cloudinary';

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

interface CheckDocumentSchema {
  departmentSequence: Department[];
  userDepartment: Department;
  document: Document;
}

interface CancelDocumentSchema {
  documentId: string;
}

interface UpdateProfileSchema {
  name: string;
  contactNumber: string;
  userId: string;
  picture?: string;
}

async function checkDocument({
  departmentSequence,
  userDepartment,
  document,
}: CheckDocumentSchema) {
  const currentIndex = departmentSequence.indexOf(userDepartment);
  if (currentIndex === -1) {
    return { error: 'Unauthorized to sign document', status: 403 };
  }

  const expectedCheckingDepartment = departmentSequence[currentIndex];

  if (document.checkedDepartments.includes(userDepartment)) {
    return {
      error: 'Department has already checked the document',
      status: 400,
    };
  }

  if (document.nextDepartment === expectedCheckingDepartment) {
    const updatedCheckedDepartments = [
      ...document.checkedDepartments,
      userDepartment,
    ];

    const updates = {
      nextDepartment: departmentSequence[currentIndex + 1],
      status:
        userDepartment === departmentSequence[0] ? 'CHECKING' : document.status,
      checkedDepartments: updatedCheckedDepartments,
    };

    if (
      document.nextDepartment ===
      departmentSequence[departmentSequence.length - 1]
    ) {
      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: 'SIGNED',
          checkedDepartments: updatedCheckedDepartments,
        },
      });

      return {
        message: 'Document signed',
        status: 200,
      };
    }

    await prisma.document.update({
      where: { id: document.id },
      data: updates,
    });

    return {
      message: 'Document checked',
      status: 200,
    };
  } else {
    return { error: 'Unauthorized to sign document', status: 404 };
  }
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

      if (document.isCancelled) {
        return res.status(400).json({ error: 'Document has been cancelled' });
      }

      if (document.isArchived || document.status === 'SIGNED') {
        return res
          .status(400)
          .json({ error: 'Document has been signed and archived' });
      }

      if (document.type === 'PURCHASE_REQUEST') {
        const departmentSequence: Department[] = ['MPDC', 'MO', 'GSO', 'BAC'];
        const { status, message, error } = await checkDocument({
          departmentSequence,
          document,
          userDepartment,
        });
        if (error) {
          return res.status(status).json({ error });
        } else {
          return res.status(status).json({ message });
        }
      } else if (document.type === 'MEMORANDUM') {
        const departmentSequence: Department[] = ['MO'];
        const { status, message, error } = await checkDocument({
          departmentSequence,
          document,
          userDepartment,
        });
        if (error) {
          return res.status(status).json({ error });
        } else {
          return res.status(status).json({ message });
        }
      } else if (document.type === 'PAYROLL') {
        const departmentSequence: Department[] = [
          'MPDC',
          'MO',
          'HRMO',
          'BO',
          'AIASO',
          'MTO',
        ];
        const { status, message, error } = await checkDocument({
          departmentSequence,
          document,
          userDepartment,
        });
        if (error) {
          return res.status(status).json({ error });
        } else {
          return res.status(status).json({ message });
        }
      } else if (document.type === 'VOUCHER_BILLING') {
        const departmentSequence: Department[] = [
          'MPDC',
          'MO',
          'MBO',
          'AIASO',
          'MTO',
        ];
        const { status, message, error } = await checkDocument({
          departmentSequence,
          document,
          userDepartment,
        });
        if (error) {
          return res.status(status).json({ error });
        } else {
          return res.status(status).json({ message });
        }
      } else {
        return res.status(404).json({ error: 'Unknown document type' });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Filed to scan QR code' });
    }
  },
);

userRouter.get('/get-documents', async (_, res) => {
  try {
    const documents = await prisma.document.findMany();

    return res.status(200).json(documents);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to get documents' });
  }
});

userRouter.post(
  '/cancel-document',
  async (req: TypedRequestBody<CancelDocumentSchema>, res) => {
    try {
      const { documentId } = req.body;

      const document = await prisma.document.findFirst({
        where: { id: documentId },
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      if (document.status === 'SIGNED') {
        return res.status(400).json({ error: 'Document is already signed' });
      }

      if (document.isCancelled) {
        return res.status(400).json({ error: 'Document is already cancelled' });
      }

      await prisma.document.update({
        where: { id: document.id },
        data: { isCancelled: true },
      });

      return res.status(200).json({ message: 'Document is cancelled' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to cancel document' });
    }
  },
);

userRouter.put(
  '/update-profile',
  async (req: TypedRequestBody<UpdateProfileSchema>, res) => {
    try {
      const { userId, ...rest } = req.body;
      const user = await prisma.user.findFirst({ where: { id: userId } });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (req.body.picture) {
        const cloudinaryResponse = await cloudinary.uploader.upload(
          req.body.picture,
        );

        rest.picture = cloudinaryResponse.secure_url;
      }

      await prisma.user.update({ where: { id: user.id }, data: { ...rest } });

      return res.status(200).json({ message: 'User profile updated' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to update user profile' });
    }
  },
);

userRouter.get('/get-document', async (req, res) => {
  try {
    const { documentId } = req.query as { documentId: string };

    const document = await prisma.document.findFirst({
      where: { id: documentId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    return res.status(200).json(document);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to get document' });
  }
});

export default userRouter;
