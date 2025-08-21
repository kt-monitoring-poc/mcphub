# MCPHub 기술적 보안 세부사항

> 작성일: 2025-08-21  
> 대상: 사내 보안팀 기술 검토용

## 1. 인증/인가 구현 세부사항

### 1.1 패스워드 보안
```typescript
// src/services/userService.ts
import bcrypt from 'bcryptjs';

// 패스워드 해싱
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// 패스워드 검증
const isValid = await bcrypt.compare(inputPassword, hashedPassword);
```

### 1.2 JWT 토큰 구조
```typescript
// src/middlewares/auth.ts
interface JWTPayload {
  userId: string;
  username: string;
  isAdmin: boolean;
  exp: number;  // 만료시간 (Unix timestamp)
  iat: number;  // 발급시간
}

// 토큰 서명 알고리즘: HS256
// 비밀키: process.env.JWT_SECRET (최소 32자 권장)
```

### 1.3 API Key 생성 및 검증
```typescript
// src/services/mcpHubKeyService.ts
export class MCPHubKeyService {
  async generateKey(): Promise<string> {
    // UUID v4 + 추가 엔트로피
    const baseKey = uuidv4();
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `mcp_${baseKey}_${timestamp}_${random}`;
  }

  async authenticateKey(key: string): Promise<AuthResult | null> {
    // 1. 키 존재 여부 확인
    // 2. 만료 시간 검증
    // 3. 활성화 상태 확인
    // 4. 사용자 활성화 상태 확인
    // 5. 사용 횟수 업데이트
    // 6. 마지막 사용 시간 기록
  }
}
```

## 2. 세션 관리

### 2.1 Redis 기반 세션 저장소
```typescript
// src/services/redisSessionStore.ts
export class RedisSessionStore {
  private redis: Redis;
  private readonly SESSION_PREFIX = 'mcphub:session:';
  private readonly SESSION_TTL = 86400; // 24시간

  async setSession(userId: string, serverId: string, sessionData: any) {
    const key = `${this.SESSION_PREFIX}${userId}:${serverId}`;
    await this.redis.setex(
      key, 
      this.SESSION_TTL, 
      JSON.stringify(sessionData)
    );
  }
}
```

### 2.2 세션 하이재킹 방지
- IP 주소 바인딩
- User-Agent 검증
- 세션 ID 주기적 재생성 (30분마다)

## 3. 입력 검증 및 삭제

### 3.1 SQL Injection 방지
```typescript
// TypeORM 파라미터 바인딩 사용
const users = await userRepository
  .createQueryBuilder('user')
  .where('user.email = :email', { email: userInput })
  .getMany();

// 절대 사용 금지 예시
// const query = `SELECT * FROM users WHERE email = '${userInput}'`;
```

### 3.2 XSS 방지
```typescript
// src/utils/sanitizer.ts
import DOMPurify from 'isomorphic-dompurify';

export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  });
};
```

### 3.3 요청 크기 제한
```typescript
// src/server.ts
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000 
}));
```

## 4. API 보안

### 4.1 Rate Limiting
```typescript
// src/middlewares/rateLimiter.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100 요청
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false,
});

// 로그인 시도 제한
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 15분당 5회 시도
  skipSuccessfulRequests: true
});
```

### 4.2 CORS 설정
```typescript
// src/server.ts
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-mcphub-key']
};
```

## 5. 암호화 세부사항

### 5.1 토큰 암호화 구현
```typescript
// src/services/dynamicMcpService.ts
private encryptToken(token: string): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32));
  const iv = randomBytes(16);
  
  const cipher = createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // IV를 암호문 앞에 추가
  return iv.toString('hex') + ':' + encrypted;
}

private decryptToken(encryptedToken: string): string {
  const [ivHex, encrypted] = encryptedToken.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  
  const decipher = createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### 5.2 환경변수 보안
```bash
# .env 파일 예시
ENCRYPTION_KEY=32-character-random-string-here!!
JWT_SECRET=another-32-char-random-string!!!
DATABASE_URL=postgresql://user:pass@localhost:5432/mcphub?sslmode=require
REDIS_URL=rediss://default:password@localhost:6379
```

## 6. 로깅 및 모니터링

### 6.1 보안 이벤트 로깅
```typescript
// src/services/logService.ts
interface SecurityEvent {
  eventType: 'LOGIN_ATTEMPT' | 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 
             'PERMISSION_DENIED' | 'API_KEY_CREATED' | 'API_KEY_REVOKED';
  userId?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  details: any;
}

// 민감정보 마스킹
const maskSensitiveData = (data: any): any => {
  const masked = { ...data };
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
  
  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = '***REDACTED***';
    }
  }
  return masked;
};
```

### 6.2 실시간 알림
```typescript
// 보안 이벤트 알림
const sendSecurityAlert = async (event: SecurityEvent) => {
  if (event.eventType === 'LOGIN_FAILURE' && event.details.attempts > 3) {
    await notificationService.send({
      channel: 'security-alerts',
      severity: 'high',
      message: `Multiple failed login attempts for user ${event.userId}`,
      details: event
    });
  }
};
```

## 7. 보안 헤더

### 7.1 HTTP 보안 헤더 설정
```typescript
// src/middlewares/securityHeaders.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// 추가 보안 헤더
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});
```

## 8. 데이터베이스 보안

### 8.1 연결 보안
```typescript
// src/db/connection.ts
const dbConfig = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('./certs/ca-cert.pem'),
    cert: fs.readFileSync('./certs/client-cert.pem'),
    key: fs.readFileSync('./certs/client-key.pem')
  },
  logging: process.env.NODE_ENV !== 'production',
  extra: {
    max: 20, // 최대 연결 수
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
};
```

### 8.2 Row Level Security (RLS)
```sql
-- PostgreSQL RLS 정책 예시
ALTER TABLE mcphub_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_keys_policy ON mcphub_keys
  FOR ALL
  USING (user_id = current_setting('app.current_user_id')::uuid);
```

## 9. 취약점 스캔 결과 및 대응

### 9.1 의존성 취약점
```bash
# package.json 주요 보안 관련 패키지
{
  "dependencies": {
    "bcryptjs": "^3.0.2",     # 패스워드 해싱
    "jsonwebtoken": "^9.0.2",  # JWT 생성/검증
    "helmet": "^7.1.0",        # 보안 헤더
    "express-rate-limit": "^6.10.0",  # Rate limiting
    "express-validator": "^7.2.1"     # 입력 검증
  }
}
```

### 9.2 정기 스캔 스케줄
- **일일**: 의존성 취약점 스캔 (npm audit)
- **주간**: SAST 스캔 (SonarQube)
- **월간**: 침투 테스트 (OWASP ZAP)
- **분기별**: 전체 보안 감사

## 10. 인시던트 대응 코드

### 10.1 자동 차단 메커니즘
```typescript
// src/services/securityService.ts
export class SecurityService {
  async blockSuspiciousActivity(userId: string, reason: string) {
    // 1. 사용자 즉시 비활성화
    await userRepository.update(userId, { isActive: false });
    
    // 2. 모든 활성 세션 종료
    await redisSessionStore.revokeAllSessions(userId);
    
    // 3. API 키 비활성화
    await mcpHubKeyRepository.deactivateUserKeys(userId);
    
    // 4. 감사 로그 기록
    await auditLog.record({
      action: 'SECURITY_BLOCK',
      userId,
      reason,
      timestamp: new Date()
    });
    
    // 5. 보안팀 알림
    await notificationService.alertSecurityTeam({
      severity: 'CRITICAL',
      userId,
      reason
    });
  }
}
```

---

**참고**: 이 문서는 MCPHub의 기술적 보안 구현 세부사항을 담고 있으며, 
실제 배포 환경에서는 각 조직의 보안 정책에 맞게 추가 조정이 필요할 수 있습니다.
