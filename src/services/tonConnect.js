import { TonConnect } from '@tonconnect/sdk';
import { Address, beginCell, Cell, toNano } from '@ton/core';
import { TonClient } from '@ton/ton';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

// Polyfill for localStorage in Node.js environment
if (typeof global !== 'undefined' && !global.localStorage) {
  global.localStorage = {
    storage: new Map(),
    getItem(key) {
      return this.storage.get(key) || null;
    },
    setItem(key, value) {
      this.storage.set(key, value);
    },
    removeItem(key) {
      this.storage.delete(key);
    },
    clear() {
      this.storage.clear();
    },
    get length() {
      return this.storage.size;
    },
    key(index) {
      return Array.from(this.storage.keys())[index];
    }
  };
}

export class TONConnectService {
  constructor() {
    // Ensure we have a valid manifest URL
    const manifestUrl = process.env.TON_CONNECT_MANIFEST_URL || 'http://localhost:3000/tonconnect-manifest.json';
    
    // Validate manifest URL format
    if (!manifestUrl.startsWith('http://') && !manifestUrl.startsWith('https://')) {
      console.error('Invalid manifest URL format:', manifestUrl);
      throw new Error('TON Connect manifest URL must start with http:// or https://');
    }
    
    console.log('Initializing TON Connect with manifest URL:', manifestUrl);
    
    try {
      this.tonConnect = new TonConnect({
        manifestUrl: manifestUrl
      });
      console.log('TON Connect successfully initialized');
    } catch (error) {
      console.error('Failed to initialize TON Connect:', error);
      throw new Error(`TON Connect initialization failed: ${error.message}`);
    }
    
    this.tonClient = new TonClient({
      endpoint: process.env.TON_RPC_ENDPOINT || 'https://testnet.toncenter.com/api/v2/',
      apiKey: process.env.TON_API_KEY
    });

    this.pendingConnections = new Map();
    this.connectedWallets = new Map();

    console.log('TON Connect initialized with manifest URL:', manifestUrl);
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.tonConnect.onStatusChange((wallet) => {
      if (wallet) {
        console.log('Wallet connected:', wallet.account.address);
        this.handleWalletConnected(wallet);
      } else {
        console.log('Wallet disconnected');
      }
    });
  }

  async generateConnectLink(userId) {
    try {
      const sessionId = uuidv4();
      
      // Store pending connection with more details
      this.pendingConnections.set(sessionId, {
        userId,
        timestamp: Date.now(),
        status: 'pending'
      });

      // Generate connection URL using proper TON Connect format
      const connectUrl = await this.tonConnect.connect({
        universalLink: 'https://app.tonkeeper.com/ton-connect',
        bridgeUrl: 'https://bridge.tonapi.io/bridge'
      });
      
      // Store the session for this user
      this.pendingConnections.set(userId.toString(), {
        sessionId,
        connectUrl,
        timestamp: Date.now(),
        status: 'pending'
      });

      console.log(`Generated connect link for user ${userId}:`, connectUrl);
      
      // Clean up old pending connections (older than 10 minutes)
      this.cleanupPendingConnections();

      return {
        connectUrl,
        sessionId
      };

    } catch (error) {
      console.error('Error generating connect link:', error);
      throw new Error('Failed to generate connection link');
    }
  }

  async checkConnectionStatus(userId) {
    try {
      // Check if wallet is already connected
      if (this.connectedWallets.has(userId)) {
        return {
          connected: true,
          wallet: this.connectedWallets.get(userId)
        };
      }

      // Check pending connections
      const pending = this.pendingConnections.get(userId.toString());
      if (pending) {
        return {
          connected: false,
          pending: true,
          status: pending.status
        };
      }

      return {
        connected: false,
        pending: false
      };
    } catch (error) {
      console.error('Error checking connection status:', error);
      return {
        connected: false,
        pending: false,
        error: error.message
      };
    }
  }

  async waitForConnection(userId, timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkInterval = setInterval(async () => {
        const status = await this.checkConnectionStatus(userId);
        
        if (status.connected) {
          clearInterval(checkInterval);
          resolve(status.wallet);
        } else if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          reject(new Error('Connection timeout'));
        }
      }, 2000); // Check every 2 seconds
    });
  }

  async handleWalletConnected(wallet) {
    try {
      const address = wallet.account.address;
      console.log('Wallet connected with address:', address);
      
      // Find the pending connection for this wallet
      let userId = null;
      for (const [key, connection] of this.pendingConnections.entries()) {
        if (connection.status === 'pending') {
          userId = connection.userId || key;
          break;
        }
      }

      if (userId) {
        // Store connected wallet
        this.connectedWallets.set(userId, {
          address: address,
          chain: wallet.account.chain,
          publicKey: wallet.account.publicKey,
          connectedAt: Date.now()
        });

        // Update pending connection status
        if (this.pendingConnections.has(userId.toString())) {
          this.pendingConnections.set(userId.toString(), {
            ...this.pendingConnections.get(userId.toString()),
            status: 'connected',
            address: address
          });
        }

        console.log(`Wallet successfully linked to user ${userId}: ${address}`);
        
        // Trigger callback if exists
        if (this.onWalletConnected) {
          this.onWalletConnected(userId, {
            address,
            chain: wallet.account.chain,
            publicKey: wallet.account.publicKey
          });
        }
      } else {
        console.log('No pending connection found for wallet:', address);
      }

    } catch (error) {
      console.error('Error handling wallet connection:', error);
    }
  }

  // Method to set callback for wallet connections
  setWalletConnectedCallback(callback) {
    this.onWalletConnected = callback;
  }

  async getWalletInfo(userId) {
    return this.connectedWallets.get(userId);
  }

  async disconnectWallet(userId) {
    try {
      await this.tonConnect.disconnect();
      this.connectedWallets.delete(userId);
      return true;
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      return false;
    }
  }

  async mintNFTReward(userId, chatId, metadata = {}) {
    try {
      const walletInfo = this.connectedWallets.get(userId);
      if (!walletInfo) {
        throw new Error('Wallet not connected for this user');
      }

      // Create NFT metadata
      const nftMetadata = {
        name: `ChannelSense Reward #${Date.now()}`,
        description: `NFT reward for active participation in channel ${chatId}`,
        image: 'https://channelsense.com/nft-reward.png',
        attributes: [
          {
            trait_type: 'Channel',
            value: chatId
          },
          {
            trait_type: 'Earned Date',
            value: new Date().toISOString()
          },
          {
            trait_type: 'Reward Type',
            value: 'Activity Reward'
          },
          ...Object.entries(metadata).map(([key, value]) => ({
            trait_type: key,
            value: value
          }))
        ]
      };

      // Deploy NFT collection if not exists
      const collectionAddress = await this.getOrCreateNFTCollection(chatId);
      
      // Mint NFT
      const nftAddress = await this.mintNFT(
        collectionAddress,
        walletInfo.address,
        nftMetadata
      );

      return {
        success: true,
        nftAddress,
        collectionAddress,
        metadata: nftMetadata,
        transactionHash: null // Will be filled after transaction confirmation
      };

    } catch (error) {
      console.error('Error minting NFT reward:', error);
      throw error;
    }
  }

  async getOrCreateNFTCollection(chatId) {
    try {
      // In a real implementation, you'd check if collection exists
      // For now, return a mock collection address
      return `EQ${chatId.slice(-60).padStart(60, '0')}`;
    } catch (error) {
      console.error('Error getting/creating NFT collection:', error);
      throw error;
    }
  }

  async mintNFT(collectionAddress, ownerAddress, metadata) {
    try {
      // This is a simplified NFT minting implementation
      // In production, you'd use proper TON NFT standards (TEP-62)
      
      const nftItemCode = this.getNFTItemCode();
      const nftItemData = this.buildNFTItemData(ownerAddress, metadata);
      
      // Create mint message
      const mintMessage = beginCell()
        .storeUint(0x18, 6) // int_msg_info
        .storeSlice(Address.parse(collectionAddress).asSlice())
        .storeCoins(toNano('0.05')) // value
        .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1) // other fields
        .storeRef(
          beginCell()
            .storeUint(1, 32) // mint opcode
            .storeUint(0, 64) // query_id
            .storeSlice(Address.parse(ownerAddress).asSlice())
            .storeCoins(toNano('0.02')) // amount
            .storeRef(nftItemData)
            .endCell()
        )
        .endCell();

      // Send transaction through connected wallet
      if (this.tonConnect.wallet) {
        const transaction = {
          validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
          messages: [
            {
              address: collectionAddress,
              amount: toNano('0.05').toString(),
              payload: mintMessage.toBoc().toString('base64')
            }
          ]
        };

        const result = await this.tonConnect.sendTransaction(transaction);
        return result;
      } else {
        throw new Error('Wallet not connected');
      }

    } catch (error) {
      console.error('Error minting NFT:', error);
      throw error;
    }
  }

  getNFTItemCode() {
    // This should be the actual NFT item smart contract code
    // For demo purposes, returning empty cell
    return beginCell().endCell();
  }

  buildNFTItemData(ownerAddress, metadata) {
    try {
      return beginCell()
        .storeUint(0, 64) // item_index
        .storeSlice(Address.parse(ownerAddress).asSlice()) // owner_address
        .storeRef(
          beginCell()
            .storeBuffer(Buffer.from(JSON.stringify(metadata), 'utf8'))
            .endCell()
        )
        .endCell();
    } catch (error) {
      console.error('Error building NFT item data:', error);
      throw error;
    }
  }

  async getWalletBalance(address) {
    try {
      const balance = await this.tonClient.getBalance(Address.parse(address));
      return balance;
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return 0n;
    }
  }

  async getTransactionHistory(address, limit = 10) {
    try {
      const transactions = await this.tonClient.getTransactions(
        Address.parse(address),
        limit
      );
      return transactions;
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }

  async verifyNFTOwnership(userAddress, nftAddress) {
    try {
      // In a real implementation, check NFT ownership on blockchain
      const nftData = await this.tonClient.runMethod(
        Address.parse(nftAddress),
        'get_nft_data'
      );
      
      const ownerAddress = nftData.stack.readAddress();
      return ownerAddress.equals(Address.parse(userAddress));
    } catch (error) {
      console.error('Error verifying NFT ownership:', error);
      return false;
    }
  }

  cleanupPendingConnections() {
    const now = Date.now();
    const timeout = 10 * 60 * 1000; // 10 minutes

    for (const [sessionId, connection] of this.pendingConnections.entries()) {
      if (now - connection.timestamp > timeout) {
        this.pendingConnections.delete(sessionId);
      }
    }
  }

  async createCollectionForChannel(chatId, channelInfo) {
    try {
      // Collection metadata
      const collectionMetadata = {
        name: `ChannelSense Rewards - ${channelInfo.title}`,
        description: `NFT collection for rewarding active members of ${channelInfo.title}`,
        image: 'https://channelsense.com/collection-image.png',
        cover_image: 'https://channelsense.com/collection-cover.png',
        social_links: [
          `https://t.me/${channelInfo.username}`
        ]
      };

      // In production, deploy actual NFT collection contract
      // For now, return mock collection address
      const collectionAddress = `EQ${chatId.toString().slice(-60).padStart(60, '0')}`;
      
      return {
        address: collectionAddress,
        metadata: collectionMetadata
      };

    } catch (error) {
      console.error('Error creating collection for channel:', error);
      throw error;
    }
  }

  async batchMintRewards(recipients, chatId, rewardType = 'weekly') {
    const results = [];

    for (const recipient of recipients) {
      try {
        const metadata = {
          'Reward Type': rewardType,
          'Rank': recipient.rank,
          'Score': recipient.score.toString(),
          'Messages': recipient.messageCount.toString()
        };

        const result = await this.mintNFTReward(
          recipient.userId,
          chatId,
          metadata
        );

        results.push({
          userId: recipient.userId,
          success: true,
          nftAddress: result.nftAddress,
          transactionHash: result.transactionHash
        });

      } catch (error) {
        results.push({
          userId: recipient.userId,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }
}
