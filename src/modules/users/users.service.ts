import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import {
  CreateUserDto,
  UserResponseDto,
  UserResponseSchema,
} from './user.schema';
import * as argon2 from 'argon2';

/**
 * @description Сервис для работы с пользователями
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  /**
   * @param createUserDto - данные для создания пользователя
   * @returns UserResponseDto - данные о созданном пользователе
   */
  public async createUser(
    createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    const createdUser = await this.userRepo.findOne({
      where: {
        email: createUserDto.email,
      },
    });

    if (createdUser) {
      throw new ConflictException('User  whith this email already exists');
    }

    const hash = await this.hashPassword(createUserDto.password);

    const user = this.userRepo.save({
      ...createUserDto,
      password: hash,
    });

    return UserResponseSchema.parse(user);
  }

  public async getUserByEmailAndVerifyPassword(
    email: string,
    password: string,
  ): Promise<UserResponseDto> {
    const user = await this.userRepo.findOne({
      where: {
        email,
      },
      select: {
        password: true,
        email: true,
        id: true,
        createdAt: true,
        name: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await this.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    return UserResponseSchema.parse(user);
  }

  /**
   * @param id - id пользователя uuid
   * @returns UserResponseDto - данные о пользователе
   */
  public async getUserById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepo.findOne({
      where: {
        id,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return UserResponseSchema.parse(user);
  }

  /**
   * @param password - пароль
   * @returns string - хэш пароля
   */
  private async hashPassword(password: string): Promise<string> {
    return await argon2.hash(password);
  }

  /**
   * @param password - string - пароль для проверки
   * @param hash - string - хэш пароля из БД
   * @returns boolean
   */
  private async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return await argon2.verify(hash, password);
  }
}
