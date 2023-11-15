import { Department, DocumentType } from '@prisma/client';
import { Router } from 'express';
import QR from 'qrcode';
import { TypedRequestBody } from '../types';
import { v2 as cloudinary } from 'cloudinary';
import prisma from '../utils/prisma';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

interface ClerkGenerateQRSchema {
  title: string;
  amount: number;
  type: DocumentType;
  departmentOrigin: Department;
}

const clerkRouter = Router();

clerkRouter.post(
  '/generate-qr',
  async (req: TypedRequestBody<ClerkGenerateQRSchema>, res) => {
    try {
      await prisma.$transaction(async (tx) => {
        let nextDepartment: Department | null = null;
        if (req.body.type === 'MEMORANDUM') {
          nextDepartment = 'MENRO';
        } else if (req.body.type === 'PURCHASE_REQUEST') {
          nextDepartment = 'BO';
        } else if (req.body.type === 'PAYROLL') {
          nextDepartment = 'AsO';
        } else if (req.body.type === 'VOUCHER_BILLING') {
          nextDepartment = 'BPLO';
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

export default clerkRouter;
