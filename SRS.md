# Software Requirements Specification (SRS)

## VaporFund Multi-Token Staking Smart Contract System

### Based on IEEE 830-1998 Standard

**Version:** 1.0  
**Date:** 10 July 2025  
**Status:** Draft

---

## Table of Contents

1. [Introduction](#1-introduction)

   - 1.1 [Purpose](#11-purpose)
   - 1.2 [Scope](#12-scope)
   - 1.3 [Definitions, Acronyms, and Abbreviations](#13-definitions-acronyms-and-abbreviations)
   - 1.4 [References](#14-references)
   - 1.5 [Overview](#15-overview)

2. [Overall Description](#2-overall-description)

   - 2.1 [Product Perspective](#21-product-perspective)
   - 2.2 [Product Functions](#22-product-functions)
   - 2.3 [User Characteristics](#23-user-characteristics)
   - 2.4 [Constraints](#24-constraints)
   - 2.5 [Assumptions and Dependencies](#25-assumptions-and-dependencies)

3. [Specific Requirements](#3-specific-requirements)

   - 3.1 [Functional Requirements](#31-functional-requirements)
   - 3.2 [Non-Functional Requirements](#32-non-functional-requirements)
   - 3.3 [Interface Requirements](#33-interface-requirements)
   - 3.4 [System Features](#34-system-features)

4. [Appendices](#4-appendices)

---

## 1. Introduction

### 1.1 Purpose

This document specifies the software requirements for the VaporFund Multi-Token Staking Smart Contract System. The system enables users to deposit whitelisted ERC20 tokens and ETH/WETH to earn staking rewards. This document is intended for smart contract developers, auditors, frontend integrators, and all stakeholders involved in the development and deployment of the staking platform.

### 1.2 Scope

The VaporFund Multi-Token Staking Smart Contract System is a decentralized application that:

- **Accepts multiple token types**: Supports a whitelist of ERC20 tokens, ETH, and WETH for staking
- **Routes funds to MultiSig**: Automatically transfers deposited funds to a system MultiSig wallet
- **Manages staking records**: Tracks individual user staking positions and rewards
- **Enables withdrawals**: Allows admin-approved withdrawals from the admin portal
- **Provides administrative control**: Includes emergency functions and token recovery

The system consists of:

- Core staking smart contract
- Token whitelist management
- Admin role-based access control
- Comprehensive event logging system
- Integration with MultiSig wallet

### 1.3 Definitions, Acronyms, and Abbreviations

| Term             | Definition                                          |
| ---------------- | --------------------------------------------------- |
| **ERC20**        | Ethereum token standard for fungible tokens         |
| **ETH**          | Native Ethereum cryptocurrency                      |
| **WETH**         | Wrapped ETH (ERC20 version of ETH)                  |
| **MultiSig**     | Multi-signature wallet requiring multiple approvals |
| **Whitelist**    | Approved list of tokens allowed for staking         |
| **Admin Portal** | Off-chain interface for administrative functions    |
| **Gas**          | Computational cost for Ethereum transactions        |
| **Wei**          | Smallest unit of ETH (1 ETH = 10^18 Wei)            |
| **Topup**        | User action of depositing tokens into the system    |
| **Allocation**   | Admin action of approving withdrawals               |

### 1.4 References

1. IEEE Std 830-1998 - IEEE Recommended Practice for Software Requirements Specifications
2. OpenZeppelin Contracts v4.9.0 Documentation
3. Ethereum Yellow Paper
4. EIP-20: Token Standard
5. EIP-712: Typed Structured Data Hashing and Signing
6. Gnosis Safe MultiSig Documentation

### 1.5 Overview

This document is organized into four main sections:

- **Section 1**: Introduction and background information
- **Section 2**: Overall system description and context
- **Section 3**: Detailed functional and non-functional requirements
- **Section 4**: Supporting appendices and additional information

## 2. Overall Description

### 2.1 Product Perspective

#### 2.1.1 System Architecture

```text
+----------------+     +-----------------+     +------------------+
|    Users       |---->| Staking Contract|---->| MultiSig Wallet  |
|   (EOAs)       |     |                 |     |                  |
+----------------+     +-----------------+     +------------------+
                              |                         |
                              v                         v
                      +-----------------+     +------------------+
                      | Token Whitelist |     |  Admin Portal    |
                      |   Management    |     |  (Off-chain)     |
                      +-----------------+     +------------------+
```

#### 2.1.2 Contract Components

```text
VaporFundStaking
├── Token Management
│   ├── Whitelist Registry
│   ├── ETH/WETH Handling
│   └── ERC20 Integration
├── Staking Operations
│   ├── Deposit (Topup)
│   ├── Withdrawal
│   └── Record Keeping
├── Admin Functions
│   ├── Withdrawal Allocation
│   ├── Withdrawal Cancellation
│   └── Emergency Recovery
└── Event System
    ├── Staking Events
    ├── Withdrawal Events
    └── Admin Events
```

### 2.2 Product Functions

#### 2.2.1 Core User Functions

1. **Multi-Token Deposits (Topup)**

   - Deposit whitelisted ERC20 tokens
   - Deposit ETH (auto-wrapped to WETH)
   - Deposit WETH directly
   - View deposit history

2. **Withdrawal Management**

   - Request withdrawals through admin portal
   - Receive allocated withdrawals
   - Track withdrawal status

3. **Staking Records**

   - View current staking positions
   - Check reward accumulation
   - Access transaction history

#### 2.2.2 Administrative Functions

1. **Withdrawal Processing**

   - Allocate withdrawals to users
   - Cancel pending withdrawals
   - Batch withdrawal processing

2. **Token Management**

   - Add/remove tokens from whitelist
   - Set token-specific parameters
   - Monitor token balances

3. **Emergency Controls**

   - Pause/unpause contract
   - Recover stuck tokens
   - Update MultiSig address

### 2.3 User Characteristics

#### 2.3.1 End Users (Stakers)

- **Technical Level**: Basic understanding of Web3 and wallets
- **Experience**: Familiar with DeFi staking concepts
- **Volume**: 100-10,000 active stakers
- **Interaction**: Through Web3 wallets (MetaMask, etc.)

#### 2.3.2 Administrators

- **Technical Level**: Advanced blockchain knowledge
- **Access**: MultiSig wallet signers
- **Responsibilities**: Withdrawal allocation, system monitoring
- **Number**: 3-5 MultiSig signers

#### 2.3.3 Contract Owner

- **Technical Level**: Expert smart contract knowledge
- **Access**: Owner address (likely MultiSig)
- **Responsibilities**: Emergency functions, upgrades
- **Number**: Single owner address

### 2.4 Constraints

#### 2.4.1 Technical Constraints

- Solidity version 0.8.19 or higher
- Gas optimization requirements (<500k gas per transaction)
- Ethereum mainnet compatibility
- EVM compatibility for L2 deployment
- Testnet features automatically disabled on mainnet (chainId == 1)

#### 2.4.2 Security Constraints

- All funds must be held in MultiSig wallet
- No upgradeable proxy pattern (immutable contract)
- Comprehensive access control
- Reentrancy protection required

#### 2.4.3 Regulatory Constraints

- Must support token whitelisting for compliance
- Transaction history must be fully auditable
- Admin actions must be transparent and logged

### 2.5 Assumptions and Dependencies

#### 2.5.1 Assumptions

- Users have sufficient ETH for gas fees
- MultiSig wallet is properly configured and secure
- Admin portal backend is available for withdrawal allocation
- Token prices are managed off-chain

#### 2.5.2 Dependencies

- OpenZeppelin Contracts library
- Functioning Ethereum network
- MultiSig wallet contract deployment
- Off-chain admin portal infrastructure

## 3. Specific Requirements

### 3.1 Functional Requirements

#### 3.1.1 Token Management Functions

##### FR-TM-001: Initialize Token Whitelist

**Description**: Contract owner can add tokens to the whitelist

**Inputs**:

- `token`: Token contract address
- `minDeposit`: Minimum deposit amount
- `maxDeposit`: Maximum deposit amount per user

**Preconditions**:

- Caller must be contract owner
- Token must be valid ERC20 contract
- Token not already whitelisted

**Postconditions**:

- Token added to whitelist
- Event `TokenWhitelisted` emitted

##### FR-TM-002: Remove Token from Whitelist

**Description**: Contract owner can remove tokens from whitelist

**Inputs**:

- `token`: Token contract address

**Preconditions**:

- Caller must be contract owner
- Token must be whitelisted

**Postconditions**:

- Token removed from whitelist
- Event `TokenRemovedFromWhitelist` emitted

#### 3.1.2 Staking Functions

##### FR-ST-001: Deposit ERC20 Tokens (Topup)

**Description**: Users can deposit whitelisted ERC20 tokens

**Inputs**:

- `token`: Token address
- `amount`: Amount to deposit

**Preconditions**:

- Token is whitelisted
- Amount >= minimum deposit
- User total <= maximum deposit
- User has approved contract
- Contract not paused

**Postconditions**:

- Tokens transferred to MultiSig wallet
- Staking record created/updated
- Event `TokensDeposited` emitted

**Pseudocode**:

```solidity
function depositToken(address token, uint256 amount) external {
    require(isWhitelisted[token], "Token not whitelisted");
    require(amount >= minDeposit[token], "Below minimum");
    require(userDeposits[msg.sender][token] + amount <= maxDeposit[token], "Exceeds maximum");

    IERC20(token).safeTransferFrom(msg.sender, multiSigWallet, amount);

    userDeposits[msg.sender][token] += amount;
    totalDeposits[token] += amount;

    emit TokensDeposited(msg.sender, token, amount, block.timestamp);
}
```

##### FR-ST-002: Deposit ETH (Topup)

**Description**: Users can deposit ETH which is converted to WETH

**Inputs**: None (ETH sent with transaction)

**Preconditions**:

- msg.value > 0
- WETH is whitelisted
- Within deposit limits
- Contract not paused

**Postconditions**:

- ETH wrapped to WETH
- WETH sent to MultiSig wallet
- Staking record updated
- Event `ETHDeposited` emitted

##### FR-ST-003: Get User Staking Records

**Description**: Query user's staking positions

**Inputs**:

- `user`: User address
- `token`: Token address (optional, 0x0 for all)

**Outputs**:

- Array of staking records with amounts and timestamps

**Preconditions**: None (view function)

#### 3.1.3 Withdrawal Functions

##### FR-WD-001: Allocate Withdrawal

**Description**: Admin allocates withdrawal to user

**Inputs**:

- `user`: Recipient address
- `token`: Token to withdraw
- `amount`: Amount to withdraw
- `nonce`: Unique identifier

**Preconditions**:

- Caller has ADMIN_ROLE
- User has sufficient staked balance
- Nonce not used before
- Contract not paused

**Postconditions**:

- Withdrawal record created
- User staking balance reduced
- Event `WithdrawalAllocated` emitted

##### FR-WD-002: Cancel Withdrawal

**Description**: Admin cancels allocated withdrawal

**Inputs**:

- `withdrawalId`: ID of withdrawal to cancel

**Preconditions**:

- Caller has ADMIN_ROLE
- Withdrawal exists and pending
- Contract not paused

**Postconditions**:

- Withdrawal marked as cancelled
- User staking balance restored
- Event `WithdrawalCancelled` emitted

##### FR-WD-003: Process Withdrawal

**Description**: Execute withdrawal from MultiSig to user

**Inputs**:

- `withdrawalId`: ID of withdrawal to process

**Preconditions**:

- Withdrawal allocated and not cancelled
- MultiSig has approved transfer
- Contract not paused

**Postconditions**:

- Tokens transferred to user
- Withdrawal marked complete
- Event `WithdrawalProcessed` emitted

#### 3.1.4 Administrative Functions

##### FR-AD-001: Emergency Withdraw All

**Description**: Owner can withdraw all tokens to owner address

**Inputs**:

- `token`: Token to withdraw (0x0 for ETH)

**Preconditions**:

- Caller must be owner
- Emergency mode activated or special conditions

**Postconditions**:

- All tokens transferred to owner
- Event `EmergencyWithdraw` emitted

##### FR-AD-002: Update MultiSig Wallet

**Description**: Update the MultiSig wallet address

**Inputs**:

- `newMultiSig`: New MultiSig address

**Preconditions**:

- Caller must be owner
- Valid address (not zero)
- Different from current

**Postconditions**:

- MultiSig address updated
- Event `MultiSigUpdated` emitted

##### FR-AD-003: Pause/Unpause Contract

**Description**: Emergency pause functionality

**Inputs**: None

**Preconditions**:

- Caller has PAUSER_ROLE
- Contract in opposite state

**Postconditions**:

- Contract paused/unpaused
- Events `Paused`/`Unpaused` emitted

#### 3.1.5 Testnet Mock Functions

##### FR-MOCK-001: Mint Test Tokens

**Description**: Mint test tokens for development/testing purposes (testnet only)

**Inputs**:

- `token`: Token address to mint
- `amount`: Amount to mint
- `recipient`: Address to receive tokens

**Preconditions**:

- Contract deployed on testnet (chainId != 1)
- Caller has ADMIN_ROLE or is owner
- Token is whitelisted

**Postconditions**:

- Test tokens minted to recipient
- Event `TestTokensMinted` emitted

##### FR-MOCK-002: Fast Forward Time

**Description**: Simulate time passing for reward calculations (testnet only)

**Inputs**:

- `seconds`: Number of seconds to advance

**Preconditions**:

- Contract deployed on testnet
- Caller has ADMIN_ROLE
- Seconds > 0 and < 365 days

**Postconditions**:

- Internal timestamp advanced
- Rewards recalculated
- Event `TimeAdvanced` emitted

##### FR-MOCK-003: Set Mock Oracle Price

**Description**: Set mock token prices for testing (testnet only)

**Inputs**:

- `token`: Token address
- `price`: Mock price in USD (18 decimals)

**Preconditions**:

- Contract deployed on testnet
- Caller has ADMIN_ROLE
- Token is whitelisted

**Postconditions**:

- Mock price updated
- Event `MockPriceSet` emitted

##### FR-MOCK-004: Simulate User Actions

**Description**: Batch simulate multiple user deposits/withdrawals (testnet only)

**Inputs**:

- `actions`: Array of user actions (deposit/withdraw)
- `randomSeed`: Seed for randomization

**Preconditions**:

- Contract deployed on testnet
- Caller has ADMIN_ROLE
- Actions array length < 100

**Postconditions**:

- Simulated actions executed
- Test data generated
- Event `SimulationCompleted` emitted

##### FR-MOCK-005: Reset Contract State

**Description**: Reset all contract state for fresh testing (testnet only)

**Inputs**: None

**Preconditions**:

- Contract deployed on testnet
- Caller is owner
- Emergency mode activated

**Postconditions**:

- All user balances reset
- All withdrawals cancelled
- Whitelist maintained
- Event `ContractReset` emitted

### 3.2 Non-Functional Requirements

#### 3.2.1 Performance Requirements

##### NFR-PERF-001: Gas Optimization

- Deposit transaction: < 150,000 gas
- Withdrawal allocation: < 100,000 gas
- Batch operations: < 500,000 gas
- View functions: < 50,000 gas

##### NFR-PERF-002: Scalability

- Support 10,000+ unique stakers
- Handle 100+ different tokens
- Process 1,000+ transactions per day

#### 3.2.2 Security Requirements

##### NFR-SEC-001: Access Control

- Role-based permissions (Owner, Admin, Pauser)
- MultiSig requirement for critical functions
- Time-locked admin actions where appropriate

##### NFR-SEC-002: Smart Contract Security

- Reentrancy guards on all state-changing functions
- Integer overflow/underflow protection
- Front-running mitigation
- Flash loan attack prevention

##### NFR-SEC-003: Audit Requirements

- Full test coverage (>95%)
- Formal verification of critical functions
- External security audit required
- Bug bounty program recommended

#### 3.2.3 Reliability Requirements

##### NFR-REL-001: Data Integrity

- All staking records must be accurate
- No loss of user funds possible
- Atomic transaction execution
- Consistent state after failures

##### NFR-REL-002: Availability

- No single point of failure
- Graceful degradation with pausing
- Clear recovery procedures
- Comprehensive event logs for reconstruction

### 3.3 Interface Requirements

#### 3.3.1 Smart Contract Interfaces

##### Interface: IVaporFundStaking

```solidity
interface IVaporFundStaking {
    // Token Management
    function whitelistToken(address token, uint256 minDeposit, uint256 maxDeposit) external;
    function removeTokenFromWhitelist(address token) external;
    function isTokenWhitelisted(address token) external view returns (bool);

    // Staking Functions
    function depositToken(address token, uint256 amount) external;
    function depositETH() external payable;
    function getStakingRecord(address user, address token) external view returns (uint256);

    // Withdrawal Functions
    function allocateWithdrawal(address user, address token, uint256 amount, uint256 nonce) external;
    function cancelWithdrawal(uint256 withdrawalId) external;
    function processWithdrawal(uint256 withdrawalId) external;

    // Admin Functions
    function emergencyWithdrawAll(address token) external;
    function updateMultiSigWallet(address newMultiSig) external;
    function pause() external;
    function unpause() external;

    // Testnet Mock Functions
    function mintTestTokens(address token, uint256 amount, address recipient) external;
    function fastForwardTime(uint256 seconds) external;
    function setMockPrice(address token, uint256 price) external;
    function simulateUserActions(ActionData[] calldata actions, uint256 randomSeed) external;
    function resetContractState() external;
}
```

#### 3.3.2 Event Interfaces

```solidity
// Token Events
event TokenWhitelisted(address indexed token, uint256 minDeposit, uint256 maxDeposit);
event TokenRemovedFromWhitelist(address indexed token);

// Staking Events
event TokensDeposited(address indexed user, address indexed token, uint256 amount, uint256 timestamp);
event ETHDeposited(address indexed user, uint256 amount, uint256 timestamp);

// Withdrawal Events
event WithdrawalAllocated(uint256 indexed withdrawalId, address indexed user, address indexed token, uint256 amount);
event WithdrawalCancelled(uint256 indexed withdrawalId, address indexed admin);
event WithdrawalProcessed(uint256 indexed withdrawalId, address indexed user, uint256 amount);

// Admin Events
event EmergencyWithdraw(address indexed token, uint256 amount, address indexed recipient);
event MultiSigUpdated(address indexed oldMultiSig, address indexed newMultiSig);
event ContractPaused(address indexed admin);
event ContractUnpaused(address indexed admin);

// Testnet Mock Events
event TestTokensMinted(address indexed token, uint256 amount, address indexed recipient);
event TimeAdvanced(uint256 seconds, uint256 newTimestamp);
event MockPriceSet(address indexed token, uint256 price);
event SimulationCompleted(uint256 actionsExecuted, uint256 randomSeed);
event ContractReset(address indexed admin, uint256 timestamp);
```

### 3.4 System Features

#### 3.4.1 Must-Have Features

1. **Multi-Token Support**

   - ERC20 token deposits with whitelist
   - Native ETH deposits with WETH conversion
   - Token-specific deposit limits

2. **Secure Fund Management**

   - All funds routed to MultiSig wallet
   - No funds held in staking contract
   - Clear separation of concerns

3. **Comprehensive Tracking**

   - Individual user staking records
   - Token-wise accounting
   - Historical transaction data

4. **Admin Controls**

   - Withdrawal allocation system
   - Emergency pause functionality
   - Token recovery mechanisms

5. **Event Logging**

   - All state changes logged
   - Indexed events for efficient querying
   - Off-chain integration support

#### 3.4.2 Security Features

1. **Access Control**

   - Role-based permissions
   - Multi-signature requirements
   - Time-locked operations

2. **Safety Mechanisms**

   - Reentrancy protection
   - Pausable functionality
   - Withdrawal limits

3. **Validation**

   - Input validation
   - State consistency checks
   - Balance verifications

#### 3.4.3 Testnet Features

1. **Mock Token Operations**

   - Mint test tokens for any whitelisted token
   - Set custom token prices for testing
   - Simulate market conditions

2. **Time Manipulation**

   - Fast forward blockchain time
   - Test reward accumulation
   - Validate time-based logic

3. **Testing Utilities**

   - Batch user action simulation
   - Contract state reset
   - Automated test data generation

4. **Development Tools**

   - Testnet-only admin functions
   - Enhanced logging for debugging
   - Gas usage tracking

## 4. Appendices

### Appendix A: State Diagram

```text
+-------------+     deposit()      +-------------+
|   Idle      |------------------>|   Staked    |
|             |                    |             |
+-------------+                    +-------------+
                                          |
                                          | allocateWithdrawal()
                                          v
                                   +-------------+
                                   |  Allocated  |
                                   | Withdrawal  |
                                   +-------------+
                                          |
                    cancelWithdrawal() +--+--+ processWithdrawal()
                           +-----------|     |-----------+
                           v           +-----+           v
                    +-------------+              +-------------+
                    |  Cancelled  |              |  Withdrawn  |
                    +-------------+              +-------------+
```

### Appendix B: Error Codes

| Code | Description                  | Resolution               |
| ---- | ---------------------------- | ------------------------ |
| E001 | Token not whitelisted        | Add token to whitelist   |
| E002 | Insufficient balance         | Check user balance       |
| E003 | Below minimum deposit        | Increase deposit amount  |
| E004 | Exceeds maximum deposit      | Reduce deposit amount    |
| E005 | Contract paused              | Wait for unpause         |
| E006 | Unauthorized access          | Check caller permissions |
| E007 | Invalid withdrawal ID        | Verify withdrawal exists |
| E008 | Withdrawal already processed | Check withdrawal status  |
| E009 | Invalid token address        | Provide valid address    |
| E010 | Nonce already used           | Use unique nonce         |

### Appendix C: Gas Estimates

| Function           | Estimated Gas | Conditions          |
| ------------------ | ------------- | ------------------- |
| depositToken       | 120,000       | First deposit       |
| depositToken       | 80,000        | Subsequent deposits |
| depositETH         | 150,000       | Including WETH wrap |
| allocateWithdrawal | 95,000        | Single allocation   |
| processWithdrawal  | 75,000        | From MultiSig       |
| whitelistToken     | 50,000        | New token           |
| emergencyWithdraw  | 100,000       | All tokens          |

### Appendix D: Integration Guidelines

1. **Frontend Integration**

   - Use ethers.js or web3.js
   - Implement proper error handling
   - Show gas estimates before transactions
   - Display transaction status

2. **Backend Integration**

   - Index all events
   - Maintain local database of records
   - Implement webhook notifications
   - Provide REST API for queries

3. **MultiSig Integration**

   - Configure signers properly
   - Set appropriate thresholds
   - Implement time delays if needed
   - Regular security reviews

4. **Testnet Deployment**

   - Deploy with mock features enabled
   - Use test token faucets
   - Configure lower gas prices
   - Enable extensive logging

### Appendix E: Testnet Configuration

#### Supported Test Networks

| Network     | Chain ID | Features          | RPC URL                                        |
| ----------- | -------- | ----------------- | ---------------------------------------------- |
| Sepolia     | 11155111 | Full mock support | https://sepolia.infura.io                      |
| Goerli      | 5        | Full mock support | https://goerli.infura.io                       |
| Mumbai      | 80001    | Polygon testnet   | https://rpc-mumbai.maticvigil.com              |
| BSC Testnet | 97       | BNB Chain testnet | https://data-seed-prebsc-1-s1.binance.org:8545 |

#### Test Token Addresses (Sepolia)

| Token     | Address | Faucet    |
| --------- | ------- | --------- |
| Test USDC | 0x...   | Available |
| Test USDT | 0x...   | Available |
| Test DAI  | 0x...   | Available |
| WETH      | 0x...   | Wrap ETH  |

#### Mock Feature Usage Examples

```solidity
// Mint test tokens
contract.mintTestTokens(testUSDC, 1000e6, userAddress);

// Fast forward 7 days
contract.fastForwardTime(7 * 24 * 60 * 60);

// Set mock price
contract.setMockPrice(testUSDC, 1e18); // $1.00

// Simulate batch deposits
ActionData[] memory actions = new ActionData[](10);
contract.simulateUserActions(actions, block.timestamp);
```

---

### Revision History

| Version | Date       | Author           | Description                 |
| ------- | ---------- | ---------------- | --------------------------- |
| 1.0     | 2025-07-10 | Development Team | Initial draft               |
| 1.1     | 2025-07-10 | Development Team | Added testnet mock features |

### Approval

| Role             | Name |
| ---------------- | ---- |
| Project Manager  | TAY  |
| Technical Lead   | KLA  |
| Security Auditor | KLA  |
