// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IVaporFundStaking
 * @dev Interface for VaporFund Multi-Token Staking Contract
 */
interface IVaporFundStaking {
    // Structs
    struct TokenInfo {
        bool isWhitelisted;
        uint256 minDeposit;
        uint256 maxDeposit;
        uint256 totalDeposited;
    }

    struct StakingRecord {
        uint256 amount;
        uint256 timestamp;
        uint256 lastRewardClaim;
    }

    struct WithdrawalRequest {
        address user;
        address token;
        uint256 amount;
        uint256 nonce;
        uint256 timestamp;
        bool processed;
        bool cancelled;
    }

    struct ActionData {
        address user;
        address token;
        uint256 amount;
        bool isDeposit;
    }

    // Events
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
    event TimeAdvanced(uint256 _seconds, uint256 newTimestamp);
    event MockPriceSet(address indexed token, uint256 price);
    event SimulationCompleted(uint256 actionsExecuted, uint256 randomSeed);
    event ContractReset(address indexed admin, uint256 timestamp);

    // Token Management Functions
    function whitelistToken(address token, uint256 minDeposit, uint256 maxDeposit) external;
    function removeTokenFromWhitelist(address token) external;
    function isTokenWhitelisted(address token) external view returns (bool);
    function getTokenInfo(address token) external view returns (TokenInfo memory);

    // Staking Functions
    function depositToken(address token, uint256 amount) external;
    function depositETH() external payable;
    function getStakingRecord(address user, address token) external view returns (uint256 amount, uint256 timestamp);
    function getUserTokenBalance(address user, address token) external view returns (uint256);
    function getUserTokens(address user) external view returns (address[] memory);

    // Withdrawal Functions
    function allocateWithdrawal(address user, address token, uint256 amount, uint256 nonce) external returns (uint256 withdrawalId);
    function cancelWithdrawal(uint256 withdrawalId) external;
    function processWithdrawal(uint256 withdrawalId) external;
    function getWithdrawalRequest(uint256 withdrawalId) external view returns (WithdrawalRequest memory);

    // Admin Functions
    function emergencyWithdrawAll(address token) external;
    function updateMultiSigWallet(address newMultiSig) external;
    function pause() external;
    function unpause() external;

    // Testnet Mock Functions (only available on testnet)
    function mintTestTokens(address token, uint256 amount, address recipient) external;
    function fastForwardTime(uint256 _seconds) external;
    function setMockPrice(address token, uint256 price) external;
    function simulateUserActions(ActionData[] calldata actions, uint256 randomSeed) external;
    function resetContractState() external;

    // View Functions
    function multiSigWallet() external view returns (address);
    function wethAddress() external view returns (address);
    function totalDeposited(address token) external view returns (uint256);
    function isTestnet() external view returns (bool);
}