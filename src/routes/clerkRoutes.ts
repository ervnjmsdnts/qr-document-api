import { Department, DocumentType } from '@prisma/client';
import { Router } from 'express';
import QR from 'qrcode';
import { TypedRequestBody } from '../types';
import prisma from '../utils/prisma';
import cloudinary from '../utils/cloudinary';

interface ClerkGenerateQRSchema {
  title: string;
  amount: number;
  type: DocumentType;
  departmentOrigin: Department;
}

interface ArchiveDocumentSchema {
  documentId: string;
}

const clerkRouter = Router();

clerkRouter.post(
  '/generate-qr',
  async (req: TypedRequestBody<ClerkGenerateQRSchema>, res) => {
    try {
      await prisma.$transaction(async (tx) => {
        let nextDepartment: Department | null = null;
        if (req.body.type === 'MEMORANDUM') {
          nextDepartment = 'MO';
        } else if (req.body.type === 'PURCHASE_REQUEST') {
          nextDepartment = 'MPDC';
        } else if (req.body.type === 'PAYROLL') {
          nextDepartment = 'MPDC';
        } else if (req.body.type === 'VOUCHER_BILLING') {
          nextDepartment = 'MPDC';
        } else {
          return res.status(404).json({ error: 'Unknown document type' });
        }

        const document = await tx.document.create({
          data: {
            ...req.body,
            nextDepartment,
          },
        });

        const dataString = JSON.stringify({ id: document.id });

        const qrCode = await QR.toDataURL(dataString);

        const cloudinaryResult = await cloudinary.uploader.upload(qrCode);

        await tx.document.update({
          where: { id: document.id },
          data: { qrCode: cloudinaryResult.url },
        });
      });
      return res.status(200).json({ message: 'QR Generated' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to generate QR code' });
    }
  },
);

clerkRouter.post(
  '/archive-document',
  async (req: TypedRequestBody<ArchiveDocumentSchema>, res) => {
    try {
      const { documentId } = req.body;

      const document = await prisma.document.findFirst({
        where: { id: documentId },
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      if (document.status !== 'SIGNED') {
        return res.status(400).json({ error: 'Document is not signed' });
      }

      await prisma.document.update({
        where: { id: document.id },
        data: { isArchived: true },
      });

      return res.status(200).json({ message: 'Document archived' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to archive document' });
    }
  },
);

export default clerkRouter;
