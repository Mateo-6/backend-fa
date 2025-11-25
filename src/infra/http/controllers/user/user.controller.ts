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
    // req.body is already validated by the middleware
    const createUserDto: CreateUserDto = req.body;
    const user = await this.userService.create(createUserDto);
    res.json(user);
  }

  public async getAll(req: Request, res: Response): Promise<void> {
    const users = await this.userService.findAll();
    res.json(users);
  }

  public async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const user = await this.userService.findById(id);
    res.json(user);
  }

}
