// Minimal FastMCP-like server using Express to echo a stable session-id and basic negotiation
import express from 'express';

const app = express();
app.use(express.json());

// Stable session id in memory to emulate upstream persistence
const SESSION_ID = 'sess-local-12345';

app.post('/mcp/', (req, res) => {
    const body = req.body || {};
    // Streamable HTTP: respond as text/event-stream with a single data frame
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Mcp-Session-Id', SESSION_ID);

    const mk = (payload) => `data: ${JSON.stringify(payload)}\n\n`;

    const initializeResult = {
        jsonrpc: '2.0',
        result: {
            protocolVersion: '2025-06-18',
            capabilities: {
                tools: { listChanged: true },
                prompts: { listChanged: true },
                resources: { listChanged: false, subscribe: false },
                logging: {}
            },
            serverInfo: { name: 'local-fastmcp-session', version: '0.0.1' }
        },
        id: body.id ?? 0
    };

    let payload;
    if (body.method === 'initialize') {
        payload = initializeResult;
    } else if (body.method === 'capabilities' || body.method === 'capabilities/list') {
        payload = initializeResult;
    } else if (body.method === 'offerings/list') {
        payload = { jsonrpc: '2.0', result: { offerings: { tools: true, prompts: true, resources: false, logging: false } }, id: body.id ?? 0 };
    } else if (body.method === 'tools/list') {
        payload = {
            jsonrpc: '2.0',
            result: {
                tools: [
                    {
                        name: 'get_session_id',
                        description: 'return session id',
                        inputSchema: { type: 'object', properties: {} }
                    }
                ]
            },
            id: body.id ?? 0
        };
    } else if (body.method === 'tools/call' && body.params?.name === 'get_session_id') {
        payload = { jsonrpc: '2.0', result: { content: [{ type: 'text', text: SESSION_ID }], isError: false }, id: body.id ?? 0 };
    } else {
        payload = { jsonrpc: '2.0', result: { content: [{ type: 'text', text: 'ok' }], isError: false }, id: body.id ?? 0 };
    }

    res.write(mk(payload));
    res.end();
});

app.listen(8124, '127.0.0.1', () => {
    // eslint-disable-next-line no-console
    console.log('local session-test server on 127.0.0.1:8124/mcp/');
});


