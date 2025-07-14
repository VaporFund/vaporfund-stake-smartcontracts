# VaporFund Multi-Token Staking Smart Contracts

## Overview

The VaporFund Staking platform is a multi-token staking system that allows users to deposit whitelisted ERC20 tokens and ETH to participate in the platform. All deposited funds are automatically transferred to a MultiSig wallet for secure management.

## Key Features

### Multi-Token Support
- Whitelist multiple ERC20 tokens for staking
- Native ETH deposits (automatically wrapped to WETH)
- Token-specific minimum and maximum deposit limits

### Secure Fund Management
- All funds routed directly to MultiSig wallet
- No funds held in the staking contract
- Admin-controlled withdrawal allocation system

### Withdrawal System
- Admin allocates withdrawals from admin portal
- Users can view their withdrawal status
- Admins can cancel pending withdrawals

### Access Control
- Role-based permissions (Owner, Admin, Pauser)
- Emergency pause functionality
- Owner-only emergency withdrawal

### Testnet Features
- Mock token minting
- Time manipulation for testing
- Price mocking for oracles
- Batch action simulation
- Contract state reset

## Contract Architecture

### Main Contracts

1. **VaporFundStaking.sol**
   - Core staking logic
   - Token whitelist management
   - Deposit/withdrawal functionality
   - Admin controls

2. **IVaporFundStaking.sol**
   - Interface defining all external functions
   - Event definitions
   - Struct definitions

3. **MockERC20.sol**
   - Test token for development
   - Faucet function on testnet
   - Mintable by owner

## Deployment

### Local Development
```bash
# Start local node
yarn hardhat node

# Deploy contracts
yarn deploy:local
```

### Testnet Deployment
```bash
# Deploy to Sepolia
yarn deploy:sepolia

# Deploy to Goerli
yarn deploy:goerli
```

### Environment Variables
Create a `.env` file with:
```
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
GOERLI_RPC_URL=https://goerli.infura.io/v3/YOUR_KEY
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
SEPOLIA_MULTISIG_WALLET=0x...
GOERLI_MULTISIG_WALLET=0x...
MAINNET_MULTISIG_WALLET=0x...
```

## Usage Examples

### Whitelisting a Token
```javascript
await staking.whitelistToken(
    tokenAddress,
    ethers.parseUnits("10", 6),    // 10 USDC minimum
    ethers.parseUnits("100000", 6)  // 100k USDC maximum
);
```

### Depositing Tokens
```javascript
// First approve the staking contract
await token.approve(stakingAddress, amount);

// Then deposit
await staking.depositToken(tokenAddress, amount);
```

### Depositing ETH
```javascript
await staking.depositETH({ value: ethers.parseEther("1.0") });
```

### Admin Allocating Withdrawal
```javascript
await staking.allocateWithdrawal(
    userAddress,
    tokenAddress,
    amount,
    uniqueNonce
);
```

## Security Considerations

1. **Reentrancy Protection**: All state-changing functions use ReentrancyGuard
2. **Access Control**: Role-based permissions for sensitive functions
3. **Pausable**: Emergency pause mechanism for critical situations
4. **Input Validation**: All inputs are validated
5. **Safe Math**: Using Solidity 0.8+ automatic overflow checks

## Testing

```bash
# Run all tests
yarn test

# Run with coverage
yarn coverage

# Run specific test file
yarn test test/VaporFundStaking.test.ts

# Run tests with gas reporting
REPORT_GAS=true yarn test
```

## Gas Optimization

- Efficient storage patterns
- Minimal external calls
- Batch operations where possible
- Events for off-chain indexing

## Audit Status

⚠️ **Not Audited**: These contracts have not been audited. Use at your own risk.

## License

MIT