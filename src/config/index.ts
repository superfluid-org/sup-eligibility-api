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
  apiKey: string;
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
    gdaPoolAddress: '0xB7d7331529dC6fb68CB602d9B738CabD84d3ae6d',
    flowrate: 1607510288065843368n,
    totalUnits: 0,
    apiKey: process.env[`STACK_PROGRAM_API_KEY_${7691}`] || ''
  },
  {
    id: 7695,
    name: 'AlfaFrens',
    gdaPoolAddress: '0x0ac6aCe504CF4583dE327808834Aaf8AA3294FE3',
    flowrate: 1607510288065843621n,
    totalUnits: 0,
    apiKey: process.env[`STACK_PROGRAM_API_KEY_${7695}`] || ''
  },
  {
    id: 7696,
    name: 'SuperBoring 1st Wave',
    gdaPoolAddress: '0xbeF36F4D3fC9b96A5eD5002a3308F768B44Cef7e',
    flowrate: 1286008230452674897n,
    totalUnits: 0,
    apiKey: process.env[`STACK_PROGRAM_API_KEY_${7696}`] || ''
  },
  {
    id: 7703,
    name: 'Flow Guilds & Octant SQF',
    gdaPoolAddress: '0xAAc36Fe22DC97C1942000A13a3967D8ef1aB11f4',
    flowrate: 321502057613168724n,
    totalUnits: 0,
    apiKey: process.env[`STACK_PROGRAM_API_KEY_${7703}`] || ''
  },
  {
    id: 7712,
    name: 'Payments & Distributions',
    gdaPoolAddress: '0x5640003112EEaAd042D055D27072e8261d28FCe4',
    flowrate: 902475598864699132n,
    totalUnits: 0,
    apiKey: process.env[`STACK_PROGRAM_API_KEY_${7712}`] || ''
  },
  {
    id: 7702,
    name: 'GoodDollar',
    gdaPoolAddress: '0x17A9ca096295472b7Ae1ECe9c7C5ad8248B9FF3d',
    flowrate: 643004115226337429n,
    totalUnits: 0,
    apiKey: process.env[`STACK_PROGRAM_API_KEY_${7702}`] || ''
  },
  {
    id: 7704,
    name: 'Giveth',
    gdaPoolAddress: '0x17A9ca096295472b7Ae1ECe9c7C5ad8248B9FF3d',
    flowrate: 643004115226337429n,
    totalUnits: 0,
    apiKey: process.env[`STACK_PROGRAM_API_KEY_${7704}`] || ''
  }
];

const config = {
  // Server settings
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // API settings
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
  
  // External services
  ethereumRpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.base.org',
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
  COMMUNITY_ACTIVATION_ID: parseInt(process.env.COMMUNITY_ACTIVATION_ID || '7370', 10),
  THRESHOLD_TIME_PERIOD: parseInt(process.env.THRESHOLD_TIME_PERIOD || '3600', 10),
  THRESHOLD_MAX_USERS: parseInt(process.env.THRESHOLD_MAX_USERS || '100', 10),
  
  // Authentication
  adminApiKey: process.env.ADMIN_API_KEY || 'admin_api_key',
  
  // Rate limiting
  defaultRateLimit: {
    requestsPerMinute: 60,
    requestsPerHour: 1000
  }
};

export default config; 