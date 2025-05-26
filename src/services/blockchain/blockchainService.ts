import { ClientConfig, createPublicClient, http, PublicClient } from 'viem';
import { base } from 'viem/chains';
import config from '../../config';
import logger from '../../utils/logger';
import axios from 'axios';
import pMemoize from 'p-memoize';
import { halfDayCache, oneHourCache, oneWeekCache } from '../../config/cache';

const gdaPoolAbi = [
  {
    inputs:[{name:"memberAddr",type:"address"}],
    name: "getUnits",
    outputs:[{name:"", type:"uint128"}],
    stateMutability:"view",
    type:"function"
  },
  {
    inputs:[],
    name: "getTotalUnits",
    outputs:[{name:"", type:"uint128"}],
    stateMutability:"view",
    type:"function"
  }
] as const;

const getUserLockerAbi = [
  {
    inputs:[{name:"user",type:"address"}],
    name: "getUserLocker",
    outputs:[{name:"isCreated", type:"bool"}, {name:"lockerAddress", type:"address"}],
    stateMutability:"view",
    type:"function"
  }
] as const;

/**
 * Blockchain Service for interacting with Ethereum contracts
 * This service handles all blockchain interactions for the Eligibility API
 */
class BlockchainService {
  private client;

  constructor() {
    logger.info("about to create client");
    logger.info(`using the baseRpcUrl: ${config.baseRpcUrl}`);
    this.client = createPublicClient({
      chain: base,
      transport: http(config.baseRpcUrl)
    });
    logger.info("client created");
    logger.info(`client: ${this.client}`);
  }

  getClient() : PublicClient {
    // @ts-ignore
    return createPublicClient({
      chain: base,
      transport: http(config.baseRpcUrl)
    })
  }
  /**
   * Get user's transaction count (nonce)
   * @param address Ethereum address
   * @returns Promise with transaction count
   */
  async getUserNonce(address: `0x${string}`): Promise<number> {
    const transactionCount = await this.client.getTransactionCount({  
      address,
    });
    return Number(transactionCount);
  }
  

  // get total units from memoized cache
  // keep cache in memory for 1 hour
  async getTotalUnitsMemoized(gdaPoolAddress: string): Promise<bigint> {
    const cachedValue = pMemoize(this.getTotalUnits, {
      cache: oneHourCache,
      cacheKey: () => `totalUnits:${gdaPoolAddress}`
    });
    return cachedValue(gdaPoolAddress);
  }
  /**
   * Check the number of total units in a GDA pool
   * @param gdaPoolAddress Address of the GDA pool contract
   * @returns Promise with total units
   */
  async getTotalUnits(gdaPoolAddress: string): Promise<bigint> {
    const totalUnits = await this.client.readContract({
      address: gdaPoolAddress as `0x${string}`,
      abi: gdaPoolAbi,
      functionName: 'getTotalUnits',
    });
    return totalUnits;
  }

  /**
   * Check if an address has claimed tokens for a specific GDA pool
   * @param lockerAddress Address of the locker contract
   * @param gdaPoolAddress Address of the GDA pool contract
   * @returns Promise with claim status (units)
   */
  async checkClaimStatus(lockerAddress: string, gdaPoolAddress: string): Promise<bigint> {
    try {
      logger.info(`Checking claim status for address ${lockerAddress} on GDA pool ${gdaPoolAddress}`);
      
      const memberUnits = await this.client.readContract({
        address: gdaPoolAddress as `0x${string}`,
        abi: gdaPoolAbi,
        functionName: 'getUnits',
        args: [lockerAddress as `0x${string}`]
      });
      return memberUnits;
    } catch (error) {
      logger.error(`Failed to check claim status for address ${lockerAddress} on GDA pool ${gdaPoolAddress}`, { error });
      // Default to not claimed in case of error
      return BigInt(0);
    }
  }
  /**
   * Get the locker addresses for multiple addresses (memoized)
   * @param addresses Array of Ethereum addresses
   * @returns Promise with locker addresses for each address
   */
  async getLockerAddressesMemoized(addresses: string[]): Promise<Map<string, string>> {
    const lockerAddresses = new Map<string, string>();
    for (const address of addresses) {
      lockerAddresses.set(address, await this.getLockerAddressMemoized(address));
    }
    return lockerAddresses;
  }
  /**
   * Get the locker address for an address (memoized)
   * @param address Ethereum address
   * @returns Promise with locker address
   */
  async getLockerAddressMemoized(address: string | `0x${string}`): Promise<string> {
    const cachedValue = pMemoize(this.getLockerAddress, {
      cache: halfDayCache,
      cacheKey: () => `lockerAddress:${address}`
    });
    return cachedValue(address);
  }
  /**
   * Get the locker addresses for multiple addresses
   * @param addresses Array of Ethereum addresses
   * @returns Promise with locker addresses for each address
   */
  async getLockerAddresses(addresses: string[]): Promise<Map<string, string>> {
    const lockerAddresses = new Map<string, string>();
    for (const address of addresses) {
      const lockerAddress = await this.getLockerAddress(address);
      lockerAddresses.set(address, lockerAddress);
    }
    return lockerAddresses;
  }

  async getLockerAddress(address: string): Promise<string> {
    logger.info(`Getting locker address for ${address} from the blockchain`);
    logger.info(`using the address  : ${config.lockerFactoryAddress}`);
    logger.info(`using the abi      : ${getUserLockerAbi}`);
    logger.info(`using the function : ${'getUserLocker'}`);
    logger.info(`using the args     : ${address.toLowerCase()}`);
    logger.info(`using the client   : ${this.getClient()}`);
    
    try {
      const [exists, lockerAddress] = await this.getClient().readContract({
        address: config.lockerFactoryAddress as `0x${string}`,
        abi: getUserLockerAbi,
        functionName: 'getUserLocker',
        args: [address.toLowerCase() as `0x${string}`]
      });
      logger.info(`Locker address for ${address}, which exists: ${exists}, is ${lockerAddress}`);
      if (!exists) {
        logger.info(`No locker address found for ${address}`);
        return "0x0000000000000000000000000000000000000000";
      }
      return lockerAddress;
    } catch (error) {
      logger.error(`Failed to get locker address for ${address}`, { error });
      return "0x0000000000000000000000000000000000000000";
    }
  }
  /**
   * Check claim status for multiple addresses across all GDA pools
   * @param lockerAddresses Map of addresses to their locker addresses
   * @returns Promise with claim status for each address and GDA pool
   */
  async checkAllClaimStatuses(lockerAddresses: Map<string, string>): Promise<Map<string, Map<number, bigint>>> {
    const allClaimStatuses = new Map<string, Map<number, bigint>>();
    
    // Initialize the map for each address
    lockerAddresses.forEach((lockerAddress, address) => {
      allClaimStatuses.set(address, new Map<number, bigint>());
    });

    // Process each address and point system combination
    const promises = [];
    
    for (const [address, lockerAddress] of lockerAddresses.entries()) {
      for (const { id, gdaPoolAddress } of config.pointSystems) {
        if (!lockerAddress || lockerAddress === "0x0000000000000000000000000000000000000000") {
          logger.info(`No locker address found for ${address}`);
          allClaimStatuses.get(address)?.set(id, BigInt(0));
          continue;
        }
        promises.push(
          (async () => {
            try {
              const memberUnits = await this.checkClaimStatus(lockerAddress, gdaPoolAddress);
              
              const statusMap = allClaimStatuses.get(address);
              if (statusMap) {
                statusMap.set(id, memberUnits);
              }
            } catch (error) {
              logger.error(`Error checking claim status for address ${address} on point system ${id}`, { error });
              // Set default status in case of error
              const statusMap = allClaimStatuses.get(address);
              if (statusMap) {
                statusMap.set(id, BigInt(0));
              }
            }
          })()
        );
      }
    }
    
    // Wait for all promises to resolve
    await Promise.all(promises);

    return allClaimStatuses;
  }
}

export default new BlockchainService(); 