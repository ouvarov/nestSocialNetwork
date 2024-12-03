// find.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PostResponseDto } from '../dto/post-response.dto';
import { CacheService } from '../../cache/cache.service';
import { PostService } from '../post.service';
import { PostDatabaseService } from '../../database/post-database.service';
import { AuthService } from '../../auth/auth.service'; // Replace with actual path

describe('PostService', () => {
  let service: PostService;
  let cacheService: CacheService;
  let postDatabaseService: PostDatabaseService;
  let authService: AuthService;

  const mockCacheService = {
    getCache: jest.fn(),
    setCache: jest.fn(),
  };

  const mockPostDatabaseService = {
    allPosts: jest.fn(),
  };

  const mockAuthService = {
    // Add any required methods for testing
    validateUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        { provide: CacheService, useValue: mockCacheService },
        { provide: PostDatabaseService, useValue: mockPostDatabaseService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<PostService>(PostService);
    cacheService = module.get<CacheService>(CacheService);
    postDatabaseService = module.get<PostDatabaseService>(PostDatabaseService);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return postsData from cache if available', async () => {
    const postsFromDb = [
      {
        post_id: '1',
        image_url: 'https://example.com/image.jpg',
        owner_id: 'user1',
        text: 'Post content',
      },
    ];

    mockCacheService.getCache.mockResolvedValue(null);
    mockPostDatabaseService.allPosts.mockResolvedValue(postsFromDb);

    const result = await service.find('1');

    // Ensure postsData is an array
    expect(Array.isArray(result.postsData)).toBe(true);

    // Check individual properties of the mapped DTO
    expect(result.postsData[0]).toHaveProperty('id', '1');
    expect(result.postsData[0]).toHaveProperty(
      'imageUrl',
      'https://example.com/image.jpg',
    );
    expect(result.postsData[0]).toHaveProperty('ownerId', 'user1');
    expect(result.postsData[0]).toHaveProperty('text', 'Post content');
  });

  it('should call database service if no cache is available and set cache', async () => {
    const postsFromDb = [
      {
        post_id: '123',
        image_url: 'https://example.com/image.jpg',
        owner_id: 'user1',
        text: 'Post content',
        created: '2024-12-03T12:35:19.844Z',
      },
    ];

    const responsePostsFromDb = [
      {
        id: '123',
        imageUrl: 'https://example.com/image.jpg',
        ownerId: 'user1',
        likes: undefined,
        text: 'Post content',
        created: '2024-12-03T12:35:19.844Z',
      },
    ];

    mockCacheService.getCache.mockResolvedValue(null);
    mockPostDatabaseService.allPosts.mockResolvedValue(postsFromDb);

    const result = await service.find('123');

    expect(mockCacheService.getCache).toHaveBeenCalledWith('post:123');
    expect(mockPostDatabaseService.allPosts).toHaveBeenCalledWith('123');
    expect(mockCacheService.setCache).toHaveBeenCalledWith(
      'post:123',
      postsFromDb,
    );
    expect(result.postsData).toEqual(responsePostsFromDb);
  });
});
