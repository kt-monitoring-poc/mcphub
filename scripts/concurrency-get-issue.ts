/*
  Usage: pnpm -s tsx scripts/concurrency-get-issue.ts <concurrency> <issueKey> [durationSec]
  Example: pnpm -s tsx scripts/concurrency-get-issue.ts 20 PROJ-123
*/
import axios from 'axios';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

async function loginAdmin(): Promise<string> {
    const resp = await axios.post(`${BASE_URL}/api/auth/login`, {
        username: 'admin',
        password: 'New1234!'
    });
    return resp.data.token as string;
}

async function getHubKey(token: string, githubUsername: string): Promise<string> {
    const list = await axios.get(`${BASE_URL}/api/oauth/keys`, {
        headers: { 'x-auth-token': token }
    });
    const keyRow = (list.data.data as any[]).find((r) => r.user?.githubUsername === githubUsername);
    if (!keyRow) throw new Error(`No key for ${githubUsername}`);
    const full = await axios.get(`${BASE_URL}/api/oauth/keys/${keyRow.id}/full-value`, {
        headers: { 'x-auth-token': token }
    });
    return full.data.data.keyValue as string;
}

async function warmup(hubKey: string): Promise<void> {
    await axios.post(
        `${BASE_URL}/mcp`,
        { jsonrpc: '2.0', id: 999, method: 'tools/list', params: {} },
        {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json, text/event-stream',
                'Mcp-Protocol-Version': '2025-06-18',
                Authorization: `Bearer ${hubKey}`
            }
        }
    ).catch(() => undefined);
}

async function callGetIssue(hubKey: string, id: number, issueKey: string): Promise<boolean> {
    const resp = await axios.post(
        `${BASE_URL}/mcp`,
        {
            jsonrpc: '2.0',
            id,
            method: 'tools/call',
            params: { name: 'get_issue', arguments: { issue_key: issueKey } }
        },
        {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json, text/event-stream',
                'Mcp-Protocol-Version': '2025-06-18',
                Authorization: `Bearer ${hubKey}`
            },
            validateStatus: () => true
        }
    );
    const data = resp.data;
    const ok = !!(data && data.result && (data.result.isError === undefined || data.result.isError === false));
    return ok;
}

async function main() {
    const concurrency = parseInt(process.argv[2] || '10', 10);
    const issueKey = process.argv[3] || 'PROJ-123';
    const durationSec = parseInt(process.argv[4] || '0', 10);

    const token = await loginAdmin();
    const hubKey = await getHubKey(token, 'jungchihoon');
    await warmup(hubKey);

    const runBatch = async (): Promise<{ ok: number; total: number }> => {
        const promises: Array<Promise<boolean>> = [];
        for (let i = 1; i <= concurrency; i += 1) {
            promises.push(callGetIssue(hubKey, i, issueKey).catch(() => false));
        }
        const results = await Promise.all(promises);
        const ok = results.filter(Boolean).length;
        return { ok, total: results.length };
    };

    if (durationSec > 0) {
        const end = Date.now() + durationSec * 1000;
        let rounds = 0;
        let okSum = 0;
        let totalSum = 0;
        while (Date.now() < end) {
            const { ok, total } = await runBatch();
            rounds += 1;
            okSum += ok;
            totalSum += total;
            // eslint-disable-next-line no-console
            console.log(`round=${rounds} ok=${ok}/${total}`);
        }
        // eslint-disable-next-line no-console
        console.log(`DONE rounds=${rounds} agg_ok=${okSum}/${totalSum}`);
    } else {
        const { ok, total } = await runBatch();
        // eslint-disable-next-line no-console
        console.log(`DONE ok=${ok}/${total}`);
    }
}

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('FAILED', err?.message || String(err));
    process.exit(1);
});


