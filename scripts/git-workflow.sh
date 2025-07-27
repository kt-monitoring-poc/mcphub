#!/bin/bash

# MCPHub Git 워크플로우 자동화 스크립트
# 사용법: ./scripts/git-workflow.sh [명령어] [옵션]

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 현재 브랜치 확인
get_current_branch() {
    git branch --show-current
}

# 메인 브랜치에서 시작
start_feature() {
    local feature_name=$1
    if [ -z "$feature_name" ]; then
        log_error "기능 이름을 입력해주세요."
        echo "사용법: $0 start-feature <기능명>"
        exit 1
    fi
    
    log_info "메인 브랜치에서 최신 상태로 업데이트..."
    git checkout main
    git pull origin main
    
    local branch_name="feature/$feature_name"
    log_info "새 브랜치 생성: $branch_name"
    git checkout -b "$branch_name"
    
    log_success "기능 개발을 위한 브랜치가 준비되었습니다: $branch_name"
}

# 커밋 생성
commit_changes() {
    local commit_type=$1
    local scope=$2
    local message=$3
    
    if [ -z "$commit_type" ] || [ -z "$message" ]; then
        log_error "커밋 타입과 메시지를 입력해주세요."
        echo "사용법: $0 commit <타입> [스코프] <메시지>"
        echo "타입: feat, fix, docs, style, refactor, test, chore"
        exit 1
    fi
    
    local commit_msg="$commit_type"
    if [ -n "$scope" ]; then
        commit_msg="$commit_msg($scope)"
    fi
    commit_msg="$commit_msg: $message"
    
    log_info "변경사항 스테이징..."
    git add .
    
    log_info "커밋 생성: $commit_msg"
    git commit -m "$commit_msg"
    
    log_success "커밋이 생성되었습니다."
}

# PR 생성
create_pr() {
    local title=$1
    local body=$2
    
    if [ -z "$title" ]; then
        log_error "PR 제목을 입력해주세요."
        echo "사용법: $0 create-pr <제목> [본문]"
        exit 1
    fi
    
    local current_branch=$(get_current_branch)
    
    log_info "현재 브랜치 푸시: $current_branch"
    git push origin "$current_branch"
    
    log_info "PR 생성 중..."
    
    # GitHub CLI가 설치되어 있는지 확인
    if command -v gh &> /dev/null; then
        if [ -n "$body" ]; then
            gh pr create --title "$title" --body "$body"
        else
            gh pr create --title "$title"
        fi
        log_success "PR이 생성되었습니다."
    else
        log_warning "GitHub CLI가 설치되어 있지 않습니다."
        log_info "다음 명령어로 수동으로 PR을 생성하세요:"
        echo "gh pr create --title \"$title\""
    fi
}

# 마일스톤 브랜치 생성
create_milestone() {
    local milestone_name=$1
    if [ -z "$milestone_name" ]; then
        log_error "마일스톤 이름을 입력해주세요."
        echo "사용법: $0 create-milestone <마일스톤명>"
        exit 1
    fi
    
    log_info "메인 브랜치에서 마일스톤 브랜치 생성..."
    git checkout main
    git pull origin main
    
    local branch_name="milestone/$milestone_name"
    log_info "새 마일스톤 브랜치 생성: $branch_name"
    git checkout -b "$branch_name"
    
    log_success "마일스톤 브랜치가 생성되었습니다: $branch_name"
}

# 상태 확인
check_status() {
    log_info "현재 Git 상태:"
    echo "현재 브랜치: $(get_current_branch)"
    echo "변경된 파일:"
    git status --porcelain
    echo ""
    echo "최근 커밋:"
    git log --oneline -5
}

# 도움말
show_help() {
    echo "MCPHub Git 워크플로우 자동화 스크립트"
    echo ""
    echo "사용법: $0 [명령어] [옵션]"
    echo ""
    echo "명령어:"
    echo "  start-feature <기능명>    - 새 기능 브랜치 생성"
    echo "  commit <타입> [스코프] <메시지> - 커밋 생성"
    echo "  create-pr <제목> [본문]   - PR 생성"
    echo "  create-milestone <이름>   - 마일스톤 브랜치 생성"
    echo "  status                    - 현재 상태 확인"
    echo "  help                      - 도움말 표시"
    echo ""
    echo "커밋 타입:"
    echo "  feat     - 새로운 기능"
    echo "  fix      - 버그 수정"
    echo "  docs     - 문서 변경"
    echo "  style    - 코드 포맷팅"
    echo "  refactor - 코드 리팩토링"
    echo "  test     - 테스트 추가/수정"
    echo "  chore    - 빌드 프로세스 변경"
    echo ""
    echo "예시:"
    echo "  $0 start-feature user-token-routing"
    echo "  $0 commit feat mcp '동적 서버 연결 시스템 구현'"
    echo "  $0 create-pr 'feat: 동적 MCP 서버 연결 시스템'"
}

# 메인 로직
case "$1" in
    "start-feature")
        start_feature "$2"
        ;;
    "commit")
        commit_changes "$2" "$3" "$4"
        ;;
    "create-pr")
        create_pr "$2" "$3"
        ;;
    "create-milestone")
        create_milestone "$2"
        ;;
    "status")
        check_status
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        log_error "알 수 없는 명령어: $1"
        echo ""
        show_help
        exit 1
        ;;
esac 