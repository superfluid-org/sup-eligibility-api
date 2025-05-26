import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface PointSystem {
  id: number;
  name: string;
  gdaPoolAddress: string;
  flowrate: bigint;
  totalUnits: number;
}

export function getStackApiKey(pointSystemId: number): string {
  return process.env[`STACK_PROGRAM_API_KEY_${pointSystemId}`] || '';
}

// TODO: Add the rest of the point systems as they are added to the stack
// TODO: ensure gdaPoolAddress is correct for each point system
// TODO: ensure flowrate is correct for each point system
// Define point systems with their IDs and GDA pool addresses

const pointSystems: PointSystem[] = [
  {
    id: 7691,
    name: 'Community Activations',
    gdaPoolAddress: '0x036b477dc59f95d445c2bf1e61d522285960969e',
    flowrate: 643004115226337429n,
    totalUnits: 0,
  },
  {
    id: 7695,
    name: 'AlfaFrens',
    gdaPoolAddress: '0x20e0d8d480317e5061631f177880d966be6d9da4',
    flowrate: 643004115226337429n,
    totalUnits: 0,
  },
  {
    id: 7696,
    name: 'SuperBoring 1st Wave',
    gdaPoolAddress: '0xc5ec1bf1c362c16ca2c851df8b9b6c3891dfefa5',
    flowrate: 643004115226337429n,
    totalUnits: 0,
  },
  {
    id: 7703,
    name: 'Flow Guilds & Octant SQF',
    gdaPoolAddress: '0x95185bd5f035ad12e27c307b800f5b51bd6a141c',
    flowrate: 643004115226337429n,
    totalUnits: 0,
  },
  {
    id: 7712,
    name: 'Payments & Distributions',
    gdaPoolAddress: '0xfe29d64182f8a41a2ac5948dab86fb2ed5091c3f',
    flowrate: 643004115226337429n,
    totalUnits: 0,
  },
  {
    id: 7702,
    name: 'GoodDollar',
    gdaPoolAddress: '0xd7891da38a00261267d88ef09f9977e4a3588ff3',
    flowrate: 643004115226337429n,
    totalUnits: 0,
  },
  {
    id: 7704,
    name: 'Giveth',
    gdaPoolAddress: '0xd5684fabc106301c9872d5e787feda728c9b8228',
    flowrate: 643004115226337429n,
    totalUnits: 0,
  },
  {
    id: 7692,
    name: 'streme.fun',
    gdaPoolAddress: '0x805fe231622ba70cf1c133c216f0c0dad5703113',
    flowrate: 643004115226337429n,
    totalUnits: 0,
  }
];

const config = {
  // Server settings
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // API settings
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
  
  // External services
  baseRpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  stackApiBaseUrl: process.env.STACK_API_BASE_URL || 'https://athena.stack.so',
  
  // Blockchain contracts
  GDAForwarder: process.env.GDA_FORWARDER || "0x6DA13Bde224A05a288748d857b9e7DDEffd1dE08",
  lockerFactoryAddress: process.env.LOCKER_FACTORY_ADDRESS || "0xA6694cAB43713287F7735dADc940b555db9d39D9",
  LOCKER_GRAPH_URL: process.env.LOCKER_GRAPH_URL || "https://api.goldsky.com/api/public/project_clsnd6xsoma5j012qepvucfpp/subgraphs/sup/2.0.0/gn",
  
  // Point system configuration
  pointSystems,
  POINT_THRESHOLD: parseInt(process.env.POINT_THRESHOLD || '99', 10),
  POINTS_TO_ASSIGN: parseInt(process.env.POINTS_TO_ASSIGN || '99', 10),
  COMMUNITY_ACTIVATION_ID: parseInt(process.env.COMMUNITY_ACTIVATION_ID || '0', 10),
  THRESHOLD_TIME_PERIOD: parseInt(process.env.THRESHOLD_TIME_PERIOD || '3600', 10),
  THRESHOLD_MAX_USERS: parseInt(process.env.THRESHOLD_MAX_USERS || '100', 10),
  STACK_EVENT_ADD_POINTS_URL: process.env.STACK_EVENT_ADD_POINTS_URL || 'https://track.stack.so/event',

  // Authentication
  adminApiKey: process.env.ADMIN_API_KEY || 'admin_api_key',
  
  // Rate limiting
  defaultRateLimit: {
    requestsPerMinute: 60,
    requestsPerHour: 1000
  }
};

export default config; 