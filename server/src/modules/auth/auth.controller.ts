import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';

export const AuthController = {
  async register(req: Request, res: Response) {
    const result = await AuthService.register(req.body);
    res.status(201).json(result);
  },

  async login(req: Request, res: Response) {
    const { identifier, password } = req.body;
    const result = await AuthService.login(identifier, password);
    res.json(result);
  },

  async refresh(req: Request, res: Response) {
    const result = await AuthService.refresh(req.body.refreshToken);
    res.json(result);
  },
};
