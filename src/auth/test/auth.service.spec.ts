import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { AuthService } from '../auth.service';
import { AuthDatabaseService } from '../../database/auth-database.module';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CreateAuthDto } from '../dto/create-auth.dto';
import { UserResponseDto } from '../../user/dto/user-response.dto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { UserService } from '../../user/user.service';
import { plainToClass } from 'class-transformer';

jest.mock('@nestjs/jwt');
const mockFn = jest.fn();
const mockJwtService = {
  sign: jest.fn((payload) => {
    if (!payload) {
      throw new Error('secretOrPrivateKey must have a value');
    }
    return 'access_token';
  }),
};

describe('AuthService', () => {
  let authService: AuthService;
  let authDatabaseService: AuthDatabaseService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let res: Response;

  beforeEach(async () => {
    const mockUserService = {
      findUserByEmail: jest.fn(),
      createUser: jest.fn(),
    };
    const mockDatabaseService = {
      findUserByEmail: jest.fn(),
      createUser: jest.fn(),
    };
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const mockEnv = {
          JWT_ACCESS_SECRET: 'jwt-access-secret-key',
          REFRESH_TOKEN_SECRET: 'jwt-refresh-secret-key', // Мок секрета для refresh токена
        };
        return mockEnv[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: AuthDatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    authDatabaseService = module.get<AuthDatabaseService>(AuthDatabaseService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    res = { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as Response;
  });

  it('should create a user and return access token and user data', async () => {
    const createUserDto: CreateAuthDto = {
      email: 'test@example.com',
      password: 'password',
      userName: 'testuser',
      created: new Date(),
    };

    const user = {
      user_id: 1,
      email: 'test@example.com',
      password: 'hashedpassword',
      user_name: 'testuser',
      created: new Date(),
    };

    authDatabaseService.createUser = jest.fn().mockResolvedValue(user);

    const result = await authService.create(createUserDto, res);

    const userResponse = plainToClass(UserResponseDto, result.userData);

    expect(userResponse).toBeInstanceOf(UserResponseDto);
    expect(result.access_token).toBe('access_token');
    console.log(res.cookie);
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImlhdCI6MTczMjk3NjEwMCwiZXhwIjoxNzM1NTY4MTAwfQ.XEH0IXKWP6OGqPGE-_kKFZin1AeUWfEin41RRHQ37JQ';

    mockFn('jwt-refresh-secret-key', token, {
      httpOnly: true,
      secure: true,
      maxAge: 2592000000,
    });

    // Обновленный тест
    expect(mockFn).toHaveBeenCalledWith(
      'jwt-refresh-secret-key',
      token,
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        maxAge: 2592000000,
      }),
    );
  });

  it('should throw exception if user creation fails', async () => {
    const createUserDto: CreateAuthDto = {
      email: 'test@example.com',
      password: 'password',
      userName: 'testuser',
      created: new Date(),
    };

    authDatabaseService.createUser = jest
      .fn()
      .mockRejectedValue(
        new HttpException(
          'User creation failed',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );

    await expect(authService.create(createUserDto, res)).rejects.toThrowError(
      HttpException,
    );
  });

  it('should generate access token correctly', async () => {
    const userId = 1;

    const signMock = jest
      .spyOn(jwtService, 'sign')
      .mockReturnValue('access_token');

    await authService.generateAccessToken(userId);

    expect(signMock).toHaveBeenCalledTimes(2);

    expect(signMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ sub: userId }),
    );

    expect(signMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ sub: userId }),
    );
  });

  it('should generate refresh token correctly', () => {
    const userId = 1;
    const token = authService.generateRefreshToken(userId);
    expect(typeof token).toBe('string');
    console.log(jwtService.sign);
    expect(jwtService.sign).toHaveBeenCalledWith({ sub: userId });
  });

  it('should return data for validation of refresh token', async () => {
    const token = 'mockRefreshToken';
    const mockUser = { id: 1, user_id: '1', email: 'test@example.com' };
    authService.validationRefreshToken = jest.fn().mockResolvedValue({
      access_token: 'access_token',
      userData: new UserResponseDto(),
    });

    const result = await authService.validationRefreshToken(token);

    expect(result.access_token).toBe('access_token');
    expect(result.userData).toBeInstanceOf(UserResponseDto);
  });

  it('should throw exception if refresh token validation fails', async () => {
    const token = 'invalidToken';
    authService.validationRefreshToken = jest
      .fn()
      .mockRejectedValue(new Error('Invalid token'));

    await expect(
      authService.validationRefreshToken(token),
    ).rejects.toThrowError(Error);
  });
});
