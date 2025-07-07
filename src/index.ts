#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

// Type definitions
interface GitHubFile {
  name: string;
  type: string;
  size: number;
  download_url: string;
}

interface CatalogueArgs {
  id: string;
  limit?: number;
}

interface SearchArgs {
  keyword: string;
}

// Type guards
function isCatalogueArgs(args: any): args is CatalogueArgs {
  return args && typeof args.id === 'string';
}

function isSearchArgs(args: any): args is SearchArgs {
  return args && typeof args.keyword === 'string';
}

// Load environment variables
dotenv.config();

class DataCatalogueMCPServer {
  server: Server;
  axiosInstance: AxiosInstance;
  githubAxios: AxiosInstance;

  constructor() {
    console.error('[Setup] Initializing Data Catalogue MCP server...');

    this.server = new Server(
      { name: 'DataCatalogue-mcp-server', version: '0.1.0' },
      { capabilities: { tools: {} } }
    );

    // Original API instance
    this.axiosInstance = axios.create({
      baseURL: 'https://api.data.gov.my',
      timeout: 10000,
      headers: { 'Accept': 'application/json' }
    });

    // GitHub API instance for fetching catalogue metadata
    this.githubAxios = axios.create({
      baseURL: 'https://api.github.com',
      timeout: 10000,
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });

    this.setupToolHandlers();
    this.server.onerror = (error) => console.error('[Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_catalogue_ids',
          description: 'Fetch list of available data catalogue IDs from GitHub repository.',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'get_catalogue_metadata',
          description: 'Fetch metadata for a specific data catalogue by ID from GitHub.',
          inputSchema: {
            type: 'object',
            properties: { 
              id: { type: 'string', description: 'ID of the dataset (e.g., "air_pollution", "population")' } 
            },
            required: ['id'],
          },
        },
        {
          name: 'get_catalogue_data',
          description: 'Fetch actual data from the data.gov.my API for a specific catalogue.',
          inputSchema: {
            type: 'object',
            properties: { 
              id: { type: 'string', description: 'ID of the dataset' },
              limit: { type: 'number', description: 'Number of records to fetch (optional, default 100)' }
            },
            required: ['id'],
          },
        },
        {
          name: 'search_catalogues',
          description: 'Search for catalogues by keyword in their names or descriptions.',
          inputSchema: {
            type: 'object',
            properties: { 
              keyword: { type: 'string', description: 'Keyword to search for in catalogue names/descriptions' }
            },
            required: ['keyword'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        if (name === 'list_catalogue_ids') {
          console.error('[GitHub] Fetching catalogue list from GitHub...');
          const response = await this.githubAxios.get('/repos/data-gov-my/datagovmy-meta/contents/data-catalogue');
          
          const catalogues = (response.data as GitHubFile[])
            .filter((item: GitHubFile) => item.type === 'file' && item.name.endsWith('.json'))
            .map((item: GitHubFile) => ({
              id: item.name.replace('.json', ''),
              name: item.name,
              download_url: item.download_url,
              size: item.size
            }));

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  catalogues,
                  count: catalogues.length,
                  message: 'Catalogue IDs fetched successfully from GitHub.'
                }, null, 2),
              },
            ],
          };

        } else if (name === 'get_catalogue_metadata') {
          if (!isCatalogueArgs(args)) {
            throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: id');
          }
          
          console.error(`[GitHub] Fetching catalogue metadata for: ${args.id}`);
          const response = await this.githubAxios.get(`/repos/data-gov-my/datagovmy-meta/contents/data-catalogue/${args.id}.json`);
          
          // Decode the base64 content
          const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
          const metadata = JSON.parse(content);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  id: args.id,
                  metadata,
                  message: 'Catalogue metadata fetched successfully.'
                }, null, 2),
              },
            ],
          };

        } else if (name === 'get_catalogue_data') {
          if (!isCatalogueArgs(args)) {
            throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: id');
          }
          
          console.error(`[API] Fetching catalogue data for: ${args.id}`);
          const params: any = { id: args.id };
          if (args.limit) params.limit = args.limit;
          
          const response = await this.axiosInstance.get('/data-catalogue', { params });
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  id: args.id,
                  data: response.data,
                  message: 'Catalogue data fetched successfully.'
                }, null, 2),
              },
            ],
          };

        } else if (name === 'search_catalogues') {
          if (!isSearchArgs(args)) {
            throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: keyword');
          }
          
          console.error(`[GitHub] Searching catalogues for keyword: ${args.keyword}`);
          
          // First get the list of all catalogues
          const listResponse = await this.githubAxios.get('/repos/data-gov-my/datagovmy-meta/contents/data-catalogue');
          const catalogueFiles = (listResponse.data as GitHubFile[])
            .filter((item: GitHubFile) => item.type === 'file' && item.name.endsWith('.json'))
            .map((item: GitHubFile) => ({
              id: item.name.replace('.json', ''),
              download_url: item.download_url
            }));

          // Search through metadata for matching catalogues
          const matchingCatalogues = [];
          const keyword = args.keyword.toLowerCase();

          for (const catalogue of catalogueFiles.slice(0, 20)) { // Limit to first 20 to avoid rate limits
            try {
              const metadataResponse = await axios.get(catalogue.download_url);
              const metadata = metadataResponse.data;
              
              const titleMatch = metadata.title && metadata.title.toLowerCase().includes(keyword);
              const descMatch = metadata.description && metadata.description.toLowerCase().includes(keyword);
              const idMatch = catalogue.id.toLowerCase().includes(keyword);
              
              if (titleMatch || descMatch || idMatch) {
                matchingCatalogues.push({
                  id: catalogue.id,
                  title: metadata.title || catalogue.id,
                  description: metadata.description || 'No description available',
                  match_reason: titleMatch ? 'title' : descMatch ? 'description' : 'id'
                });
              }
            } catch (error) {
              console.error(`[Warning] Failed to fetch metadata for ${catalogue.id}:`, (error as Error).message);
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  keyword: args.keyword,
                  matches: matchingCatalogues,
                  count: matchingCatalogues.length,
                  message: `Found ${matchingCatalogues.length} catalogues matching "${args.keyword}".`
                }, null, 2),
              },
            ],
          };

        } else {
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const errMsg = error.response?.data?.message || error.message;
          console.error('[Error] API request failed:', errMsg);
          throw new McpError(ErrorCode.InternalError, `API request failed: ${errMsg}`);
        } else if (error instanceof Error) {
          console.error('[Error] Failed to process request:', error);
          throw new McpError(ErrorCode.InternalError, `Failed to process request: ${error.message}`);
        }
        throw error;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Data Catalogue MCP server running on stdio');
  }
}

const server = new DataCatalogueMCPServer();
server.run().catch(console.error);