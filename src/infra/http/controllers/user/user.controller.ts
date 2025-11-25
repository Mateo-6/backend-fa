// controllers/UserController.ts
import { Request, Response } from "express";
import { UserService } from "../../../../domain/user/services/user-service";
import { CreateUserDto } from "../../../../application/dto/user/create-user.dto";

export class UserController {
  private readonly userService: UserService;

  /**
   * @param {UserService} userService Service encapsulating user business logic.
   */
  constructor(userService: UserService) {
    this.userService = userService;
  }

  /**
   * Creates a new user using the validated payload provided in the request body.
   *
   * @param {Request} req Express request containing the user payload.
   * @param {Response} res Express response used to return the created user.
   * @returns {Promise<void>} Resolves when the response is sent.
   */
  public async create(req: Request, res: Response): Promise<void> {
    // req.body is already validated by the middleware
    const createUserDto: CreateUserDto = req.body;
    const user = await this.userService.create(createUserDto);
    res.json(user);
  }

  /**
   * Retrieves and returns the full list of users.
   *
   * @param {Request} req Express request object.
   * @param {Response} res Express response used to return the users.
   * @returns {Promise<void>} Resolves when the response is sent.
   */
  public async getAll(req: Request, res: Response): Promise<void> {
    const users = await this.userService.findAll();
    res.json(users);
  }

  /**
   * Retrieves a user by the identifier included in the route parameters.
   *
   * @param {Request} req Express request whose params contain the user ID.
   * @param {Response} res Express response used to return the user.
   * @returns {Promise<void>} Resolves when the response is sent.
   */
  public async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const user = await this.userService.findById(id);
    res.json(user);
  }

}
