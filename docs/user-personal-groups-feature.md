# 사용자 개인 그룹 관리 기능

## 📋 개요

사용자 개인 그룹 관리 기능은 MCPHub 사용자가 자신만의 MCP 서버 그룹을 만들어서 Cursor IDE에서 표시할 도구들을 선택적으로 제어할 수 있게 해주는 기능입니다.

## 🎯 핵심 개념

### **사용자 중심 그룹 관리**
- **개인 그룹**: 각 사용자가 자신만의 MCP 서버 그룹을 생성/관리
- **선택적 도구 제어**: 그룹에 포함된 서버의 도구만 Cursor IDE에 표시
- **독립적 관리**: 다른 사용자와 그룹을 공유하지 않음

### **동작 원리**
```
사용자가 그룹 생성/관리
    ↓
DB에 user_groups 테이블에 저장
    ↓
Cursor IDE에서 MCPHub 연결 시
    ↓
MCPHub Key로 사용자 인증
    ↓
사용자의 활성 그룹 확인
    ↓
활성 그룹의 서버 도구만 Cursor에 표시
```

## 🔧 기술적 구현

### **데이터베이스 스키마**

```sql
CREATE TABLE user_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  servers TEXT[] NOT NULL,
  isActive BOOLEAN NOT NULL DEFAULT true,
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  createdAt TIMESTAMP NOT NULL DEFAULT now(),
  updatedAt TIMESTAMP NOT NULL DEFAULT now()
);
```

**인덱스**:
- `IDX_user_groups_user_active` on `(userId, isActive)`

### **백엔드 구조**

#### **1. 엔티티 (Entity)**
- `src/db/entities/UserGroup.ts`: 사용자 그룹 엔티티 정의

#### **2. 리포지토리 (Repository)**
- `src/db/repositories/UserGroupRepository.ts`: 데이터베이스 작업 처리

#### **3. 서비스 (Service)**
- `src/services/userGroupService.ts`: 비즈니스 로직 처리
  - `getUserGroups(userId)`: 사용자의 모든 그룹 조회
  - `getActiveUserGroups(userId)`: 활성 그룹만 조회
  - `getActiveServers(userId)`: 활성 그룹의 서버 목록 반환
  - `createGroup(userId, data)`: 새 그룹 생성
  - `updateGroup(groupId, userId, data)`: 그룹 수정
  - `deleteGroup(groupId, userId)`: 그룹 삭제
  - `setGroupActive(groupId, userId, isActive)`: 그룹 활성화/비활성화

#### **4. 컨트롤러 (Controller)**
- `src/controllers/userGroupController.ts`: API 엔드포인트 처리

#### **5. 라우터 (Router)**
- `src/routes/userGroupRoutes.ts`: API 라우팅 정의

### **프론트엔드 구조**

#### **1. 페이지 컴포넌트**
- `frontend/src/pages/UserGroupsPage.tsx`: 사용자 그룹 관리 페이지

#### **2. 네비게이션**
- `frontend/src/components/layout/Sidebar.tsx`: "MCP 서버 그룹" 메뉴 추가
- `frontend/src/App.tsx`: `/user-groups` 라우트 추가

## 🚀 사용 시나리오

### **시나리오 1: 그룹이 없는 사용자**
```
사용자: 그룹을 만들지 않은 상태
Cursor IDE 연결: 모든 MCP 서버의 도구가 표시됨
결과: 기본 동작 (모든 도구 사용 가능)
```

### **시나리오 2: 활성 그룹이 있는 사용자**
```
사용자: "개발 작업" 그룹 생성 (GitHub, Jira 서버 포함)
그룹 상태: 활성화
Cursor IDE 연결: GitHub, Jira 서버의 도구만 표시
결과: 선택된 서버의 도구만 사용 가능
```

### **시나리오 3: 비활성 그룹만 있는 사용자**
```
사용자: "문서 작업" 그룹 생성 (Firecrawl, Confluence 서버 포함)
그룹 상태: 비활성화
Cursor IDE 연결: 아무 도구도 표시되지 않음
결과: 도구 사용 불가 (그룹을 활성화해야 함)
```

### **시나리오 4: 여러 그룹 관리**
```
사용자: 
  - "개발 작업" 그룹 (활성): GitHub, Jira
  - "문서 작업" 그룹 (비활성): Firecrawl, Confluence
Cursor IDE 연결: GitHub, Jira 서버의 도구만 표시
결과: 활성 그룹의 서버 도구만 사용 가능
```

## 📊 API 엔드포인트

### **1. 그룹 목록 조회**
```http
GET /api/user/groups
```

**응답**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "개발 작업",
      "description": "GitHub과 Jira 관련 도구들",
      "servers": ["GitHub PR MCP (ACA)", "mcp-atlassian"],
      "isActive": true,
      "createdAt": "2025-08-01T14:10:38.790Z",
      "updatedAt": "2025-08-01T14:15:58.669Z"
    }
  ]
}
```

### **2. 그룹 생성**
```http
POST /api/user/groups
```

**요청 본문**:
```json
{
  "name": "문서 작업",
  "description": "문서 작성 관련 도구들",
  "servers": ["firecrawl-mcp", "confluence-mcp"]
}
```

### **3. 그룹 수정**
```http
PUT /api/user/groups/:groupId
```

**요청 본문**:
```json
{
  "name": "개발 작업 v2",
  "description": "업데이트된 개발 도구들",
  "servers": ["GitHub PR MCP (ACA)", "mcp-atlassian", "firecrawl-mcp"]
}
```

### **4. 그룹 삭제**
```http
DELETE /api/user/groups/:groupId
```

### **5. 그룹 활성화/비활성화**
```http
PATCH /api/user/groups/:groupId/active
```

**요청 본문**:
```json
{
  "isActive": false
}
```

## 🔍 MCP 서비스 통합

### **그룹 필터링 로직**

`src/services/mcpService.ts`의 `handleListToolsRequest` 함수에서 그룹 필터링이 적용됩니다:

```typescript
// 사용자 그룹 필터링 로직
let filteredServers: string[] = [];
let hasUserGroups = false;

if (extra && extra.mcpHubKey) {
  try {
    const mcpHubKeyService = new MCPHubKeyService();
    const authResult = await mcpHubKeyService.authenticateKey(extra.mcpHubKey);
    if (authResult) {
      const userGroupService = new UserGroupService();
      
      // 사용자가 그룹을 가지고 있는지 확인
      const allUserGroups = await userGroupService.getUserGroups(authResult.user.id);
      hasUserGroups = allUserGroups.length > 0;
      
      if (hasUserGroups) {
        // 그룹이 있으면 활성 그룹의 서버만 필터링
        const activeServers = await userGroupService.getActiveServers(authResult.user.id);
        filteredServers = activeServers;
      }
    }
  } catch (error) {
    console.warn('사용자 그룹 필터링 실패:', error);
  }
}

// 서버 필터링 적용
const allServerInfos = serverInfos.filter((serverInfo) => {
  if (serverInfo.enabled === false) return false;

  // 사용자 그룹 필터링 로직
  if (hasUserGroups) {
    // 사용자가 그룹을 가지고 있으면 활성 그룹의 서버만 표시
    return filteredServers.includes(serverInfo.name);
  }

  // 그룹이 없는 경우: 기존 그룹 필터링 로직
  if (!requestGroup) return true;
  // ... 기존 로직
});
```

### **디버깅 로그**

그룹 필터링 과정이 상세히 로그로 출력됩니다:

```
[그룹 필터링] 사용자 jungchihoon:
  - 총 그룹 수: 1
  - 그룹 목록: [ 'test(비활성)' ]
  - 활성 서버: 없음
  - 서버 mcp-atlassian: 제외
  - 서버 GitHub PR MCP (ACA): 제외
[그룹 필터링] 최종 결과: 0개 서버 표시
```

## 🎨 사용자 인터페이스

### **그룹 관리 페이지**

`/user-groups` 페이지에서 다음 기능을 제공합니다:

1. **기능 설명**: 그룹 관리의 목적과 동작 원리 설명
2. **그룹 생성**: 새 그룹 생성 폼
3. **그룹 목록**: 기존 그룹들의 목록과 상태 표시
4. **그룹 편집**: 그룹 이름, 설명, 서버 목록 수정
5. **활성화/비활성화**: 그룹별 활성 상태 토글
6. **그룹 삭제**: 불필요한 그룹 제거

### **UI 특징**

- **직관적인 설명**: 그룹 관리의 목적과 사용법을 명확히 설명
- **상태 표시**: 각 그룹의 활성/비활성 상태를 시각적으로 표시
- **서버 정보**: 그룹에 포함된 서버 수와 도구 수 표시
- **빈 상태 처리**: 그룹이 없을 때 안내 메시지와 생성 버튼 제공

## 🔒 보안 고려사항

### **사용자 격리**
- 각 사용자는 자신의 그룹만 접근 가능
- 다른 사용자의 그룹 정보 노출 방지
- API 엔드포인트에서 사용자 ID 검증

### **권한 검증**
- 모든 그룹 관련 API에서 사용자 인증 필수
- 그룹 수정/삭제 시 소유자 검증
- 관리자 권한으로도 다른 사용자의 그룹 접근 불가

## 🧪 테스트 시나리오

### **테스트 1: 기본 동작**
1. 그룹이 없는 사용자로 Cursor IDE 연결
2. 모든 MCP 서버의 도구가 표시되는지 확인

### **테스트 2: 그룹 생성 및 활성화**
1. 새 그룹 생성 (서버 선택)
2. 그룹 활성화
3. Cursor IDE에서 해당 서버의 도구만 표시되는지 확인

### **테스트 3: 그룹 비활성화**
1. 활성 그룹을 비활성화
2. Cursor IDE에서 도구가 표시되지 않는지 확인

### **테스트 4: 다중 그룹**
1. 여러 그룹 생성
2. 일부만 활성화
3. 활성 그룹의 서버 도구만 표시되는지 확인

## 📈 성능 고려사항

### **데이터베이스 최적화**
- `(userId, isActive)` 복합 인덱스로 빠른 조회
- 사용자별 그룹 수 제한 없음 (필요시 추가 고려)

### **캐싱 전략**
- 사용자 그룹 정보는 자주 변경되지 않으므로 캐싱 가능
- 그룹 변경 시 캐시 무효화

### **확장성**
- 사용자 수 증가에 대비한 인덱스 최적화
- 그룹별 서버 수 제한 없음

## 🔮 향후 개선 계획

### **단기 개선**
- [ ] 그룹 템플릿 기능 (미리 정의된 그룹 제공)
- [ ] 그룹 공유 기능 (팀 단위 그룹 관리)
- [ ] 그룹 사용 통계 (어떤 그룹이 자주 사용되는지)

### **장기 개선**
- [ ] 그룹 자동 생성 (사용 패턴 기반)
- [ ] 그룹 권한 관리 (읽기/쓰기 권한 분리)
- [ ] 그룹 버전 관리 (그룹 변경 히스토리)

---

**작성일**: 2025-08-01  
**버전**: 1.0.0  
**작성자**: MCPHub 개발팀 