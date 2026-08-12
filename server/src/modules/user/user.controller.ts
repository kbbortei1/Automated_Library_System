import type { Request, Response } from 'express';
import { UserService } from './user.service.js';

export const UserController = {
  async getMe(req: Request, res: Response) {
    res.json(await UserService.getMe(req.user!.sub));
  },

  async updateProfile(req: Request, res: Response) {
    res.json(await UserService.updateProfile(req.user!.sub, req.body));
  },

  async changePassword(req: Request, res: Response) {
    const { currentPassword, newPassword } = req.body;
    res.json(await UserService.changePassword(req.user!.sub, currentPassword, newPassword));
  },

  async listMembers(req: Request, res: Response) {
    res.json(await UserService.listMembers(req.query));
  },

  async setStatus(req: Request, res: Response) {
    res.json(
      await UserService.setStatus(req.params.id, req.body.status, {
        id: req.user!.sub,
        role: req.user!.role,
      }),
    );
  },

  async setRole(req: Request, res: Response) {
    res.json(
      await UserService.setRole(req.params.id, req.body.role, {
        id: req.user!.sub,
        role: req.user!.role,
      }),
    );
  },

  async setMembership(req: Request, res: Response) {
    res.json(await UserService.setMembershipType(req.params.id, req.body.membershipType));
  },
};
