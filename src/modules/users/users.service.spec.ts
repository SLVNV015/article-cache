import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  const mockUser: User = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    name: 'Тест Тестов',
    password: 'hashedPassword123',
    createdAt: new Date('2024-01-01'),
  };

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    const createUserDto = {
      email: 'new@example.com',
      password: 'password123',
      name: 'Новый Пользователь',
    };

    it('должен создать пользователя с хешированным паролем', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue({
        ...mockUser,
        email: createUserDto.email,
        name: createUserDto.name,
        createdAt: new Date(),
      });

      const result = await service.createUser(createUserDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.email).toBe(createUserDto.email);
      expect(result.name).toBe(createUserDto.name);
      expect(result).not.toHaveProperty('password');
    });

    it('должен выбросить ConflictException если email уже существует', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.createUser(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createUser(createUserDto)).rejects.toThrow(
        'User  whith this email already exists',
      );
    });

    it('должен хешировать пароль перед сохранением', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const hashedPassword = await argon2.hash(createUserDto.password);
      mockRepository.save.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
        createdAt: new Date(),
      });

      await service.createUser(createUserDto);

      const saveCall = mockRepository.save.mock.calls[0][0];
      expect(saveCall.password).not.toBe(createUserDto.password);
      const isValid = await argon2.verify(saveCall.password, createUserDto.password);
      expect(isValid).toBe(true);
    });
  });

  describe('getUserById', () => {
    it('должен вернуть пользователя по id', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserById(mockUser.id);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(result).not.toHaveProperty('password');
    });

    it('должен выбросить NotFoundException если пользователь не найден', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getUserById('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getUserById('non-existent-id'),
      ).rejects.toThrow('User not found');
    });
  });

  describe('getUserByEmailAndVerifyPassword', () => {
    const email = 'test@example.com';
    const password = 'password123';

    beforeEach(async () => {
      const hashedPassword = await argon2.hash(password);
      mockUser.password = hashedPassword;
    });

    it('должен вернуть пользователя при правильных credentials', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserByEmailAndVerifyPassword(
        email,
        password,
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email },
        select: {
          password: true,
          email: true,
          id: true,
          createdAt: true,
          name: true,
        },
      });
      expect(result.email).toBe(email);
      expect(result).not.toHaveProperty('password');
    });

    it('должен выбросить NotFoundException если пользователь не найден', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getUserByEmailAndVerifyPassword(email, password),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getUserByEmailAndVerifyPassword(email, password),
      ).rejects.toThrow('User not found');
    });

    it('должен выбросить UnauthorizedException при неправильном пароле', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.getUserByEmailAndVerifyPassword(email, 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.getUserByEmailAndVerifyPassword(email, 'wrongpassword'),
      ).rejects.toThrow('Invalid password');
    });

    it('должен правильно верифицировать хешированный пароль', async () => {
      const hashedPassword = await argon2.hash(password);
      mockRepository.findOne.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      const result = await service.getUserByEmailAndVerifyPassword(
        email,
        password,
      );

      expect(result).toBeDefined();
      expect(result.email).toBe(email);
    });
  });

  describe('edge cases', () => {
    it('должен обрабатывать пустую строку в email', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getUserByEmailAndVerifyPassword('', 'password'),
      ).rejects.toThrow(NotFoundException);
    });

    it('должен обрабатывать очень длинные имена пользователей', async () => {
      const longName = 'А'.repeat(1000);
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue({
        ...mockUser,
        name: longName,
        createdAt: new Date(),
      });

      const result = await service.createUser({
        email: 'long@example.com',
        password: 'password123',
        name: longName,
      });

      expect(result.name).toBe(longName);
    });

    it('должен обрабатывать специальные символы в email', async () => {
      const specialEmail = 'test+special@example.com';
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue({
        ...mockUser,
        email: specialEmail,
        createdAt: new Date(),
      });

      const result = await service.createUser({
        email: specialEmail,
        password: 'password123',
        name: 'Test User',
      });

      expect(result.email).toBe(specialEmail);
    });
  });
});
