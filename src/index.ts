import express from 'express';
import env from 'dotenv';
import cors from 'cors';
import authRouter from './routes/authRoutes';

env.config();

export const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (_, res) => {
  res.json({ message: 'Start' });
});

app.use('/api', authRouter);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log('Server running on PORT: ', PORT);
});
