/**
 * MockWalletService - Abstracted wallet/account layer
 * 
 * This service mocks wallet functionality for future blockchain integration.
 * Replace this with actual wallet SDK when integrating blockchain.
 * 
 * Future integration points:
 * - connect() -> Connect to MetaMask/WalletConnect
 * - sign() -> Sign transactions
 * - getAddress() -> Get wallet address
 */

export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: number;
}

class MockWalletServiceImpl {
  private state: WalletState = {
    connected: false,
    address: null,
    balance: 0,
  };

  private listeners: Set<(state: WalletState) => void> = new Set();

  /**
   * Connect wallet (mocked)
   */
  async connect(): Promise<boolean> {
    // Simulate connection delay
    await this.delay(500);

    // Generate mock address
    this.state = {
      connected: true,
      address: this.generateMockAddress(),
      balance: 1000, // Mock starting balance
    };

    this.notifyListeners();
    console.log('[MockWallet] Connected:', this.state.address);
    return true;
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    this.state = {
      connected: false,
      address: null,
      balance: 0,
    };
    this.notifyListeners();
    console.log('[MockWallet] Disconnected');
  }

  /**
   * Get current wallet state
   */
  getState(): WalletState {
    return { ...this.state };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state.connected;
  }

  /**
   * Get wallet address
   */
  getAddress(): string | null {
    return this.state.address;
  }

  /**
   * Get balance
   */
  getBalance(): number {
    return this.state.balance;
  }

  /**
   * Sign a message (mocked)
   */
  async signMessage(message: string): Promise<string> {
    if (!this.state.connected) {
      throw new Error('Wallet not connected');
    }

    await this.delay(200);
    
    // Return mock signature
    const mockSignature = `0x${this.hashString(message + this.state.address)}`;
    console.log('[MockWallet] Signed message');
    return mockSignature;
  }

  /**
   * Send transaction (mocked)
   */
  async sendTransaction(to: string, amount: number): Promise<string> {
    if (!this.state.connected) {
      throw new Error('Wallet not connected');
    }

    if (amount > this.state.balance) {
      throw new Error('Insufficient balance');
    }

    await this.delay(1000);

    this.state.balance -= amount;
    this.notifyListeners();

    // Return mock transaction hash
    const txHash = `0x${this.hashString(Date.now().toString() + to + amount)}`;
    console.log('[MockWallet] Transaction sent:', txHash);
    return txHash;
  }

  /**
   * Subscribe to wallet state changes
   */
  subscribe(callback: (state: WalletState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private notifyListeners(): void {
    this.listeners.forEach((cb) => cb({ ...this.state }));
  }

  private generateMockAddress(): string {
    const chars = '0123456789abcdef';
    let address = '0x';
    for (let i = 0; i < 40; i++) {
      address += chars[Math.floor(Math.random() * chars.length)];
    }
    return address;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const MockWalletService = new MockWalletServiceImpl();
