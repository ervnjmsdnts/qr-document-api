import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/authRoutes';
import adminRouter from './routes/adminRoutes';
import userRouter from './routes/userRoutes';

export const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (_, res) => {
  res.json({ message: 'Start' });
});

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/user', userRouter);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log('Server running on PORT: ', PORT);
});
