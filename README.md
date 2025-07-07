# Data.gov.my MCP Server

Data.gov.my MCP Server is a Model Context Protocol (MCP) server that provides seamless access to Malaysia's official government data catalogue. It enables developers to discover, explore, and fetch datasets from the Malaysian government's open data platform through a simple, unified interface.

## 🔧 Installation

Install the package via npm:

```bash
npm install -g datagovmy-mcp-server
```

> **Note:** No API key required! This server directly accesses Malaysia's public data catalogue.

## 💬 Example Usage

Configure the MCP server in your Claude Desktop or compatible MCP client:

```json
{
  "mcpServers": {
    "datagovmy": {
      "command": "npx",
      "args": ["datagovmy-mcp-server"]
    }
  }
}
```

Once the server is running, you can:

- **Discover datasets**: Browse all available Malaysian government datasets
- **Search by keyword**: Find specific datasets related to topics like "pollution", "population", or "economy"
- **Explore metadata**: Get detailed information about dataset structure, descriptions, and sources
- **Fetch actual data**: Retrieve real government data for analysis and visualization

## 🚀 Available Tools

### `list_catalogue_ids`
Fetch a complete list of all available data catalogue IDs from the Malaysian government repository.

### `get_catalogue_metadata`
Get detailed metadata for a specific dataset, including:
- Dataset description and methodology
- Data structure and field definitions
- Publication schedule and sources
- Data quality information

### `search_catalogues`
Search through available datasets using keywords to find relevant data about specific topics.

### `get_catalogue_data`
Fetch the actual data from Malaysia's data.gov.my API for analysis, visualization, or integration into your applications.

## 📊 Example Datasets

Access hundreds of Malaysian government datasets including:
- **Economic indicators**: GDP, inflation, trade statistics
- **Demographics**: Population data, census information
- **Environment**: Air quality, water quality, climate data
- **Health**: Healthcare statistics, disease surveillance
- **Education**: School enrollment, literacy rates
- **Transportation**: Traffic data, public transport usage

## 🔍 Data Sources

All data is sourced directly from:
- **API**: `https://api.data.gov.my` - Official Malaysian government data API
- **Metadata**: `https://github.com/data-gov-my/datagovmy-meta` - Dataset documentation and structure

## 📚 References

This MCP server integrates with:
- [Claude Desktop](https://claude.ai) and other MCP-compatible AI clients
- [Data.gov.my](https://data.gov.my) - Malaysia's official open data portal
- [Model Context Protocol](https://modelcontextprotocol.io) - The standard for connecting AI assistants to data sources

## 📩 Contact

For questions about the Malaysian government datasets or data.gov.my platform, please visit the official [Data.gov.my website](https://data.gov.my).

For issues with this MCP server, please file an issue on the [GitHub repository](https://github.com/your-username/datagovmy-mcp-server).

## 🏢 About Data.gov.my

Data.gov.my is Malaysia's official open data portal, managed by the Malaysian government to promote transparency, innovation, and data-driven decision making. The platform provides free access to government datasets across various sectors and ministries.

## 🏷️ Tags

`malaysia` • `government-data` • `open-data` • `mcp-server` • `data-catalogue` • `api` • `claude` • `ai-integration` • `typescript` • `nodejs`