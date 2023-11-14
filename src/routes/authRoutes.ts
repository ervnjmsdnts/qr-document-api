import { Router } from 'express';

const authRouter = Router();

authRouter.get('/test', (req, res) => {
  res.json('Test');
});

export default authRouter;
