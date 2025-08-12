# minimal FastMCP server exposing get_session_id
from fastmcp import FastMCP, Context

mcp = FastMCP(name="session-test")

@mcp.tool
async def get_session_id(ctx: Context) -> dict:
    return {"session_id": ctx.session_id()}

if __name__ == "__main__":
    # Streamable HTTP (alias 'http') on 127.0.0.1:8124 /mcp/
    mcp.run(transport="http", host="127.0.0.1", port=8124, path="/mcp/")


