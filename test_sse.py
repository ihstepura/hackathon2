import asyncio
import httpx

async def test_sse():
    print("Connecting to SSE endpoint...")
    async with httpx.AsyncClient() as client:
        async with client.stream("GET", "http://localhost:8002/agent/analyze/NVDA") as response:
            async for line in response.aiter_lines():
                if line:
                    print(line)

if __name__ == "__main__":
    asyncio.run(test_sse())
