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

// Load environment variables
dotenv.config();

class DataCatalogueMCPServer {
  server: Server;
  axiosInstance: AxiosInstance;

  constructor() {
    console.error('[Setup] Initializing Data Catalogue MCP server...');

    this.server = new Server(
      { name: 'DataCatalogue-mcp-server', version: '0.1.0' },
      { capabilities: { tools: {} } }
    );

    this.axiosInstance = axios.create({
      baseURL: 'https://api.data.gov.my',
      timeout: 10000,
      headers: { 'Accept': 'application/json' }
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
          name: 'get_catalogues',
          description: 'Fetch list of all data catalogues.',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'get_catalogue',
          description: 'Fetch a specific data catalogue by id.',
          inputSchema: {
            type: 'object',
            properties: { id: { type: 'string', description: 'ID of the dataset' } },
            required: ['id'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        if (name === 'get_catalogues') {
          console.error('[API] Fetching all data catalogues...');
          const response = await this.axiosInstance.get('/data-catalogue');
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  catalogues: response.data,
                  message: 'Catalogues fetched successfully.'
                }, null, 2),
              },
            ],
          };
        } else if (name === 'get_catalogue') {
          if (!args || !args.id) throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: id');
          console.error(`[API] Fetching catalogue with id: ${args.id}`);
          const response = await this.axiosInstance.get('/data-catalogue', { params: { id: args.id } });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  catalogue: response.data,
                  message: 'Catalogue fetched successfully.'
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