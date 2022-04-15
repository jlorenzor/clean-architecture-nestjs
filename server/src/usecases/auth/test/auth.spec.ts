import { IBcryptService } from '../../../domain/adapters/bcrypt.interface';
import { IJwtService } from '../../../domain/adapters/jwt.interface';
import { JWTConfig } from '../../../domain/config/jwt.interface';
import { IException } from '../../../domain/exceptions/exceptions.interface';
import { ILogger } from '../../../domain/logger/logger.interface';
import { UserM } from '../../../domain/model/user';
import { UserRepository } from '../../../domain/repositories/userRepository.interface';
import { LoginUseCases } from '../login.usecases';

describe('uses_cases/authentication', () => {
  let loginUseCases: LoginUseCases;
  let logger: ILogger;
  let exception: IException;
  let jwtService: IJwtService;
  let jwtConfig: JWTConfig;
  let adminUserRepo: UserRepository;
  let bcryptService: IBcryptService;

  beforeEach(() => {
    logger = {} as ILogger;
    logger.log = jest.fn();

    exception = {} as IException;

    jwtService = {} as IJwtService;
    jwtService.createToken = jest.fn();

    jwtConfig = {} as JWTConfig;
    jwtConfig.getJwtExpirationTime = jest.fn();
    jwtConfig.getJwtSecret = jest.fn();
    jwtConfig.getJwtRefreshSecret = jest.fn();
    jwtConfig.getJwtRefreshExpirationTime = jest.fn();

    adminUserRepo = {} as UserRepository;
    adminUserRepo.getUserByUsername = jest.fn();
    adminUserRepo.updateLastLogin = jest.fn();
    adminUserRepo.updateRefreshToken = jest.fn();

    bcryptService = {} as IBcryptService;
    bcryptService.compare = jest.fn();

    loginUseCases = new LoginUseCases(logger, jwtService, jwtConfig, adminUserRepo, bcryptService);
  });

  describe('creating a cookie', () => {
    it('should return a cookie', async () => {
      const expireIn = '200';
      const token = 'token';
      (jwtConfig.getJwtSecret as jest.Mock).mockReturnValue(() => 'secret');
      (jwtConfig.getJwtExpirationTime as jest.Mock).mockReturnValue(expireIn);
      (jwtService.createToken as jest.Mock).mockReturnValue(token);

      expect(await loginUseCases.getCookieWithJwtToken('username')).toEqual(
        `Authentication=${token}; HttpOnly; Path=/; Max-Age=${expireIn}`,
      );
    });
    it('should return a refresh cookie', async () => {
      const expireIn = '200';
      const token = 'token';
      (jwtConfig.getJwtRefreshSecret as jest.Mock).mockReturnValue(() => 'secret');
      (jwtConfig.getJwtRefreshExpirationTime as jest.Mock).mockReturnValue(expireIn);
      (jwtService.createToken as jest.Mock).mockReturnValue(token);
      (adminUserRepo.updateRefreshToken as jest.Mock).mockReturnValue(() => null);

      expect(await loginUseCases.getCookieWithJwtRefreshToken('username')).toEqual(
        `Refresh=${token}; HttpOnly; Path=/; Max-Age=${expireIn}`,
      );
    });
  });

  describe('validation user', () => {
    it('should return null because user not found', async () => {
      (adminUserRepo.getUserByUsername as jest.Mock).mockReturnValue(() => null);

      expect(await loginUseCases.validateUserForLocalStragtegy('username', 'password')).toEqual(null);
    });
    it('should return null because wrong password', async () => {
      (adminUserRepo.getUserByUsername as jest.Mock).mockReturnValue(
        () => ({ username: 'username', password: 'wrong' } as UserM),
      );
      (bcryptService.compare as jest.Mock).mockReturnValue(false);

      expect(await loginUseCases.validateUserForLocalStragtegy('username', 'password')).toEqual(null);
    });
    it('should return user without password', async () => {
      const { password, ...rest } = new UserM();
      (adminUserRepo.getUserByUsername as jest.Mock).mockReturnValue(
        () => ({ username: 'username', password: 'password' } as UserM),
      );
      (bcryptService.compare as jest.Mock).mockReturnValue(true);

      expect(await loginUseCases.validateUserForLocalStragtegy('username', 'password')).toEqual(rest);
    });
  });
});
