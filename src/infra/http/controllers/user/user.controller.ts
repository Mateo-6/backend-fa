// controllers/UserController.ts
import { Request, Response } from "express";
import { UserService } from "../../../../domain/user/services/user-service";
import { CreateUserDto } from "../../../../application/dto/user/create-user.dto";

export class UserController {
  private readonly userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  public async create(req: Request, res: Response): Promise<void> {
    try {
      // req.body ya está validado por el middleware
      const createUserDto: CreateUserDto = req.body;
      const user = await this.userService.create(createUserDto);
      res.json(user);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  public async getAll(req: Request, res: Response): Promise<void> {
    try {
      const users = await this.userService.findAll();
      res.json(users);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.userService.findById(id);
      res.json(user);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

}
