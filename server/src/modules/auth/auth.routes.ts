import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { loginSchema, refreshSchema, registerSchema } from './auth.schemas.js';

export const authRouter = Router();

authRouter.post('/register', validateBody(registerSchema), asyncHandler(AuthController.register));
authRouter.post('/login', validateBody(loginSchema), asyncHandler(AuthController.login));
authRouter.post('/refresh', validateBody(refreshSchema), asyncHandler(AuthController.refresh));
