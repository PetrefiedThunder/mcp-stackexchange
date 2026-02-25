# mcp-stackexchange

Search Stack Overflow and 170+ Stack Exchange sites for Q&A.

> **Free API** — No API key required.

## Tools

| Tool | Description |
|------|-------------|
| `search` | Search questions on Stack Exchange sites. |
| `get_question` | Get a question with its body and answers. |
| `get_tags` | Get popular tags on a site. |
| `get_user` | Get a user profile. |
| `list_sites` | List all Stack Exchange network sites. |

## Installation

```bash
git clone https://github.com/PetrefiedThunder/mcp-stackexchange.git
cd mcp-stackexchange
npm install
npm run build
```

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "stackexchange": {
      "command": "node",
      "args": ["/path/to/mcp-stackexchange/dist/index.js"]
    }
  }
}
```

## Usage with npx

```bash
npx mcp-stackexchange
```

## License

MIT
