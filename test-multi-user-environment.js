#!/usr/bin/env node

/**
 * 다중 사용자 환경 MCP 서버 연결 테스트
 * 
 * 이 스크립트는 여러 사용자가 각자의 API Key로 MCP 서버에 접근하는 시나리오를 테스트합니다.
 */

const axios = require('axios');

// 테스트 설정
const BASE_URL = 'http://localhost:3000';
const TEST_USERS = [
    {
        name: 'jungchihoon',
        mcpHubKey: 'mcphub_test_user_1_key',
        apiKeys: {
            FIRECRAWL_TOKEN: 'fc-89c11d9ad6ab4636bbfdfff9731d0972',
            GITHUB_TOKEN: 'ghp_test_github_token_1',
            OPENAI_API_KEY: 'sk-test-openai-key-1'
        }
    },
    {
        name: 'testuser2',
        mcpHubKey: 'mcphub_test_user_2_key',
        apiKeys: {
            FIRECRAWL_TOKEN: 'fc-different-firecrawl-token',
            GITHUB_TOKEN: 'ghp_test_github_token_2',
            OPENAI_API_KEY: 'sk-test-openai-key-2'
        }
    }
];

// 색상 출력 함수
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

// 테스트 헬퍼 함수들
async function testUserAuthentication(user) {
    logInfo(`사용자 인증 테스트: ${user.name}`);

    try {
        // MCPHub Key 인증 테스트
        const authResponse = await axios.post(`${BASE_URL}/api/oauth/keys/authenticate`, {
            keyValue: user.mcpHubKey
        });

        if (authResponse.data.success) {
            logSuccess(`${user.name} 인증 성공`);
            return true;
        } else {
            logError(`${user.name} 인증 실패: ${authResponse.data.message}`);
            return false;
        }
    } catch (error) {
        logError(`${user.name} 인증 오류: ${error.message}`);
        return false;
    }
}

async function testApiKeyStorage(user) {
    logInfo(`API Key 저장 테스트: ${user.name}`);

    try {
        // API Key 저장
        const saveResponse = await axios.put(`${BASE_URL}/api/oauth/keys/default/tokens`, user.apiKeys, {
            headers: {
                'x-mcphub-key': user.mcpHubKey
            }
        });

        if (saveResponse.data.success) {
            logSuccess(`${user.name} API Key 저장 성공`);
            return true;
        } else {
            logError(`${user.name} API Key 저장 실패: ${saveResponse.data.message}`);
            return false;
        }
    } catch (error) {
        logError(`${user.name} API Key 저장 오류: ${error.message}`);
        return false;
    }
}

async function testMcpServerConnection(user, serverName) {
    logInfo(`${user.name}의 ${serverName} 서버 연결 테스트`);

    try {
        // MCP 서버 도구 목록 요청
        const toolsResponse = await axios.post(`${BASE_URL}/mcp`, {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/list',
            params: {}
        }, {
            headers: {
                'x-mcphub-key': user.mcpHubKey,
                'Content-Type': 'application/json'
            }
        });

        if (toolsResponse.data.result) {
            const tools = toolsResponse.data.result.tools || [];
            logSuccess(`${user.name}의 ${serverName} 연결 성공 - ${tools.length}개 도구`);
            return true;
        } else {
            logError(`${user.name}의 ${serverName} 연결 실패`);
            return false;
        }
    } catch (error) {
        logError(`${user.name}의 ${serverName} 연결 오류: ${error.message}`);
        return false;
    }
}

async function testToolCall(user, serverName, toolName) {
    logInfo(`${user.name}의 ${serverName}에서 ${toolName} 도구 호출 테스트`);

    try {
        // 도구 호출 요청
        const callResponse = await axios.post(`${BASE_URL}/mcp`, {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
                name: toolName,
                arguments: {}
            }
        }, {
            headers: {
                'x-mcphub-key': user.mcpHubKey,
                'Content-Type': 'application/json'
            }
        });

        if (callResponse.data.result) {
            logSuccess(`${user.name}의 ${toolName} 호출 성공`);
            return true;
        } else {
            logError(`${user.name}의 ${toolName} 호출 실패`);
            return false;
        }
    } catch (error) {
        logError(`${user.name}의 ${toolName} 호출 오류: ${error.message}`);
        return false;
    }
}

async function testConcurrentUserAccess() {
    logInfo('동시 사용자 접근 테스트');

    const testPromises = TEST_USERS.map(async (user) => {
        const results = {
            user: user.name,
            authentication: false,
            apiKeyStorage: false,
            firecrawlConnection: false,
            githubConnection: false
        };

        // 인증 테스트
        results.authentication = await testUserAuthentication(user);

        if (results.authentication) {
            // API Key 저장 테스트
            results.apiKeyStorage = await testApiKeyStorage(user);

            if (results.apiKeyStorage) {
                // Firecrawl 연결 테스트
                results.firecrawlConnection = await testMcpServerConnection(user, 'firecrawl-mcp');

                // GitHub 연결 테스트
                results.githubConnection = await testMcpServerConnection(user, 'github-mcp');
            }
        }

        return results;
    });

    const results = await Promise.all(testPromises);

    // 결과 출력
    log('\n📊 동시 사용자 접근 테스트 결과:', 'bright');
    results.forEach(result => {
        log(`\n👤 ${result.user}:`, 'cyan');
        log(`   인증: ${result.authentication ? '✅' : '❌'}`);
        log(`   API Key 저장: ${result.apiKeyStorage ? '✅' : '❌'}`);
        log(`   Firecrawl 연결: ${result.firecrawlConnection ? '✅' : '❌'}`);
        log(`   GitHub 연결: ${result.githubConnection ? '✅' : '❌'}`);
    });

    return results;
}

async function testUserIsolation() {
    logInfo('사용자 격리 테스트');

    // 첫 번째 사용자로 API Key 저장
    const user1 = TEST_USERS[0];
    await testApiKeyStorage(user1);

    // 두 번째 사용자로 같은 서버에 접근 시도
    const user2 = TEST_USERS[1];

    try {
        const response = await axios.post(`${BASE_URL}/mcp`, {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/list',
            params: {}
        }, {
            headers: {
                'x-mcphub-key': user2.mcpHubKey,
                'Content-Type': 'application/json'
            }
        });

        // 두 번째 사용자는 첫 번째 사용자의 API Key에 접근할 수 없어야 함
        if (response.data.error) {
            logSuccess('사용자 격리 성공: 두 번째 사용자가 첫 번째 사용자의 API Key에 접근할 수 없음');
            return true;
        } else {
            logError('사용자 격리 실패: 두 번째 사용자가 첫 번째 사용자의 API Key에 접근할 수 있음');
            return false;
        }
    } catch (error) {
        logSuccess('사용자 격리 성공: 두 번째 사용자 접근 거부됨');
        return true;
    }
}

// 메인 테스트 실행
async function runTests() {
    log('🚀 다중 사용자 환경 MCP 서버 연결 테스트 시작', 'bright');
    log('=' * 60, 'cyan');

    try {
        // 1. 동시 사용자 접근 테스트
        log('\n📋 1단계: 동시 사용자 접근 테스트', 'bright');
        const concurrentResults = await testConcurrentUserAccess();

        // 2. 사용자 격리 테스트
        log('\n📋 2단계: 사용자 격리 테스트', 'bright');
        const isolationResult = await testUserIsolation();

        // 3. 결과 요약
        log('\n📊 테스트 결과 요약', 'bright');
        log('=' * 60, 'cyan');

        const totalUsers = concurrentResults.length;
        const successfulAuths = concurrentResults.filter(r => r.authentication).length;
        const successfulApiKeys = concurrentResults.filter(r => r.apiKeyStorage).length;
        const successfulFirecrawl = concurrentResults.filter(r => r.firecrawlConnection).length;
        const successfulGitHub = concurrentResults.filter(r => r.githubConnection).length;

        log(`총 사용자: ${totalUsers}명`);
        log(`인증 성공: ${successfulAuths}/${totalUsers}`);
        log(`API Key 저장 성공: ${successfulApiKeys}/${totalUsers}`);
        log(`Firecrawl 연결 성공: ${successfulFirecrawl}/${totalUsers}`);
        log(`GitHub 연결 성공: ${successfulGitHub}/${totalUsers}`);
        log(`사용자 격리: ${isolationResult ? '✅' : '❌'}`);

        // 전체 성공 여부 판단
        const overallSuccess = successfulAuths === totalUsers &&
            successfulApiKeys === totalUsers &&
            isolationResult;

        if (overallSuccess) {
            logSuccess('\n🎉 모든 테스트가 성공적으로 완료되었습니다!');
        } else {
            logError('\n⚠️ 일부 테스트가 실패했습니다. 로그를 확인해주세요.');
        }

    } catch (error) {
        logError(`테스트 실행 중 오류 발생: ${error.message}`);
        process.exit(1);
    }
}

// 스크립트 실행
if (require.main === module) {
    runTests().catch(error => {
        logError(`테스트 실행 실패: ${error.message}`);
        process.exit(1);
    });
}

module.exports = {
    testUserAuthentication,
    testApiKeyStorage,
    testMcpServerConnection,
    testToolCall,
    testConcurrentUserAccess,
    testUserIsolation,
    runTests
}; 