# 프론트엔드/백엔드 분리 작업 계획서

## 📋 **개요**

MCPHub의 프론트엔드와 백엔드를 완전히 분리하여 MCP 프로토콜 표준 준수와 확장성을 향상시키는 작업입니다.

**작업 일자**: 2025-08-01  
**담당자**: Assistant + 사용자  
**브랜치**: `feature/frontend-backend-separation`

---

## 🔍 **현재 상황 분석**

### **문제점**
1. **MCP 라우팅 충돌**: 프론트엔드 SPA 라우팅이 `/mcp` endpoint를 가로챔
2. **표준 미준수**: `/mcp/user/:userKey` 같은 커스텀 path는 MCP 표준이 아님
3. **운영 복잡성**: 프론트엔드와 백엔드가 같은 포트(3000)에서 혼재
4. **확장성 저하**: 정적 파일 서빙과 API 서빙이 혼재

### **현재 구조**
```
Port 3000 (Express)
├── /api/*          → API endpoints
├── /mcp            → MCP endpoint (충돌 발생)
├── /mcp/user/*     → 커스텀 MCP endpoint (비표준)
├── /assets/*       → 정적 파일
└── /*              → SPA routing (index.html)
```

---

## 🎯 **목표 구조**

### **분리 후 구조**
```
Backend (Port 3000)
├── /api/*          → API endpoints
└── /mcp            → MCP endpoint (표준 준수)

Frontend (Port 5173)
├── /assets/*       → 정적 파일
└── /*              → SPA routing
```

### **운영 환경 (Nginx/Proxy)**
```
https://mcphub.company.com
├── /api/*          → Backend (3000)
├── /mcp            → Backend (3000)
└── /*              → Frontend (static files)
```

---

## 📝 **작업 단계**

### **1단계: MCP Endpoint 표준화**
- [ ] `/mcp/user/:userKey` 라우팅 제거
- [ ] `/mcp` endpoint만 사용하도록 수정
- [ ] 인증 방식을 쿼리 파라미터 또는 헤더로 변경
- [ ] Cursor IDE 호환성 테스트

**변경 파일**:
- `src/server.ts`
- `src/services/sseService.ts`
- `frontend/src/pages/KeyManagementPage.tsx`

### **2단계: 백엔드 정리**
- [ ] 정적 파일 서빙 코드 완전 제거
- [ ] SPA 라우팅 코드 제거
- [ ] MCP/API endpoint만 남기기
- [ ] CORS 미들웨어 추가

**변경 파일**:
- `src/server.ts`
- `package.json` (cors 패키지 추가)

### **3단계: 프론트엔드 분리**
- [ ] Vite 개발 서버 설정 수정
- [ ] API endpoint 환경변수 설정
- [ ] 프록시 설정 (개발 환경)
- [ ] 빌드 스크립트 분리

**변경 파일**:
- `frontend/vite.config.ts`
- `frontend/.env.development`
- `frontend/src/utils/runtime.ts`

### **4단계: 개발 환경 설정**
- [ ] 개발 스크립트 분리
- [ ] 동시 실행 스크립트 추가
- [ ] 환경변수 관리

**변경 파일**:
- `package.json`
- `frontend/package.json`
- `.env.development`

### **5단계: 운영 환경 가이드**
- [ ] Nginx 설정 예시 작성
- [ ] Docker 설정 업데이트
- [ ] 배포 가이드 문서화

**새 파일**:
- `docs/deployment-separated.md`
- `nginx-separated.conf.example`

---

## 🔧 **기술적 상세사항**

### **MCP 인증 방식 변경**

**현재 (비표준)**:
```typescript
// URL: http://localhost:3000/mcp/user/mcphub_abc123
```

**변경 후 (표준)**:
```typescript
// URL: http://localhost:3000/mcp?key=mcphub_abc123
// 또는
// URL: http://localhost:3000/mcp
// Headers: { "Authorization": "Bearer mcphub_abc123" }
```

### **Cursor IDE 설정 변경**

**현재**:
```json
{
  "mcpServers": {
    "mcp-hub": {
      "type": "streamable-http",
      "url": "http://localhost:3000/mcp/user/YOUR_KEY"
    }
  }
}
```

**변경 후**:
```json
{
  "mcpServers": {
    "mcp-hub": {
      "type": "streamable-http",
      "url": "http://localhost:3000/mcp?key=YOUR_KEY"
    }
  }
}
```

### **CORS 설정**

```typescript
app.use(cors({
  origin: [
    'http://localhost:5173',  // 개발 환경
    'https://mcphub.company.com'  // 운영 환경
  ],
  credentials: true
}));
```

### **프론트엔드 프록시 설정**

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/mcp': 'http://localhost:3000'
    }
  }
});
```

---

## 📋 **체크리스트**

### **필수 확인사항**
- [ ] MCP 프로토콜 표준 준수 (`/mcp` endpoint만 사용)
- [ ] Cursor IDE와의 호환성 확인
- [ ] 기존 사용자 인증/권한 시스템 정상 동작
- [ ] 사용자 그룹 관리 기능 정상 동작
- [ ] 모든 API endpoint 정상 동작
- [ ] 프론트엔드 모든 페이지 정상 접근

### **성능/보안 확인사항**
- [ ] CORS 설정 정확성
- [ ] 환경변수 보안 (토큰 노출 방지)
- [ ] 개발/운영 환경 분리
- [ ] 빌드 시간 및 성능 확인

---

## 🚨 **주의사항**

### **작업 중 중단하지 말 것**
1. **MCP endpoint 변경**: 단계별로 진행하되, 중간에 중단하면 Cursor IDE 연결 불가
2. **인증 시스템**: 기존 사용자 토큰이 무효화되지 않도록 주의
3. **프론트엔드 빌드**: 정적 파일 경로가 깨지지 않도록 주의

### **롤백 계획**
- 각 단계별로 커밋 생성
- 문제 발생 시 이전 커밋으로 즉시 롤백
- 현재 상태: `705eee6` 커밋에서 시작

---

## 📞 **문제 발생 시 대응**

### **MCP 연결 실패**
1. `/mcp` endpoint 응답 확인
2. 인증 헤더/파라미터 확인
3. CORS 설정 확인

### **프론트엔드 접근 불가**
1. Vite 개발 서버 상태 확인
2. 프록시 설정 확인
3. API endpoint 환경변수 확인

### **API 호출 실패**
1. CORS 설정 확인
2. 백엔드 포트 및 endpoint 확인
3. 인증 토큰 전달 확인

---

## 📈 **예상 효과**

1. **MCP 표준 준수**: Cursor IDE와 완벽 호환
2. **운영 안정성**: 프론트엔드/백엔드 독립 배포
3. **개발 효율성**: 각각 독립적인 개발 환경
4. **확장성**: 프론트엔드/백엔드 개별 스케일링 가능
5. **보안**: 명확한 경계와 CORS 제어

---

**이 문서는 작업 진행 중 지속적으로 업데이트됩니다.**