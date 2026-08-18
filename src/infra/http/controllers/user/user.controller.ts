import { Request, Response } from 'express';
import { UserService } from '../../../../application/services/user.service';
import { CreateUserDto } from '../../../../application/dto/user/create-user.dto';
import { UpdateUserDto } from '../../../../application/dto/user/update-user.dto';
import { NotFoundError } from '../../../../domain/errors/app-error';
import { sendSuccess } from '../../utils/response.util';
import { AuthenticatedRequest } from '../../types/request.types';
import { logger } from '../../../utils/logger';

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
    const { requestId } = req as AuthenticatedRequest;
    const createUserDto: CreateUserDto = req.body;

    logger.info('Creating user', { requestId, email: createUserDto.email });
    const user = await this.userService.create(createUserDto);
    logger.info('User created', { requestId, userId: user.id });
    sendSuccess(res, user, 201);
  }

  /**
   * Retrieves and returns the full list of users.
   *
   * @param {Request} req Express request object.
   * @param {Response} res Express response used to return the users.
   * @returns {Promise<void>} Resolves when the response is sent.
   */
  public async getAll(req: Request, res: Response): Promise<void> {
    const { requestId } = req as AuthenticatedRequest;
    logger.info('Fetching all users', { requestId });

    const users = await this.userService.findAll();
    sendSuccess(res, users);
  }

  /**
   * Retrieves a user by the identifier included in the route parameters.
   *
   * @param {Request} req Express request whose params contain the user ID.
   * @param {Response} res Express response used to return the user.
   * @returns {Promise<void>} Resolves when the response is sent.
   */
  public async getById(req: Request, res: Response): Promise<void> {
    const { requestId } = req as AuthenticatedRequest;
    const { id } = req.params as { id: string };

    logger.info('Fetching user by ID', { requestId, targetId: id });
    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }
    sendSuccess(res, user);
  }

  /**
   * Updates an existing user using the validated payload provided in the request body.
   *
   * @param {Request} req Express request containing the user ID in params and the update payload in body.
   * @param {Response} res Express response used to return the updated user.
   * @returns {Promise<void>} Resolves when the response is sent.
   */
  public async update(req: Request, res: Response): Promise<void> {
    const { requestId } = req as AuthenticatedRequest;
    const { id } = req.params as { id: string };
    const updateUserDto: UpdateUserDto = req.body;

    logger.info('Updating user', { requestId, targetId: id });
    const user = await this.userService.update(id, updateUserDto);
    sendSuccess(res, user);
  }

  /**
   * Deletes a user by the identifier included in the route parameters.
   *
   * @param {Request} req Express request whose params contain the user ID.
   * @param {Response} res Express response used to return the confirmation.
   * @returns {Promise<void>} Resolves when the response is sent.
   */
  public async delete(req: Request, res: Response): Promise<void> {
    const { requestId } = req as AuthenticatedRequest;
    const { id } = req.params as { id: string };

    logger.info('Deleting user', { requestId, targetId: id });
    await this.userService.delete(id);
    sendSuccess(res, null, 204);
  }
}
