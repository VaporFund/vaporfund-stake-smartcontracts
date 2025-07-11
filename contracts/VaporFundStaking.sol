// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./interfaces/IVaporFundStaking.sol";

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address owner) external view returns (uint256);
}

/**
 * @title VaporFundStaking
 * @dev Multi-token staking contract with admin-controlled withdrawals
 * All deposited funds are automatically transferred to a MultiSig wallet
 */
contract VaporFundStaking is IVaporFundStaking, AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using Address for address payable;

    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // State variables
    address public multiSigWallet;
    address public immutable wethAddress;
    uint256 public withdrawalCounter;
    uint256 private mockTimestamp; // For testnet time manipulation

    // Mappings
    mapping(address => TokenInfo) public tokenInfo;
    mapping(address => mapping(address => uint256)) public userDeposits;
    mapping(address => mapping(address => StakingRecord)) public stakingRecords;
    mapping(address => address[]) private userTokenList;
    mapping(address => mapping(address => bool)) private userHasToken;
    mapping(uint256 => WithdrawalRequest) public withdrawalRequests;
    mapping(uint256 => bool) public usedNonces;
    mapping(address => uint256) public mockPrices; // For testnet price mocking

    // Constructor
    constructor(address _multiSigWallet, address _wethAddress) {
        require(_multiSigWallet != address(0), "Invalid MultiSig address");
        require(_wethAddress != address(0), "Invalid WETH address");
        
        multiSigWallet = _multiSigWallet;
        wethAddress = _wethAddress;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    // Modifiers
    modifier onlyTestnet() {
        require(isTestnet(), "Function only available on testnet");
        _;
    }

    modifier validAddress(address _address) {
        require(_address != address(0), "Invalid address");
        _;
    }

    // Token Management Functions
    function whitelistToken(
        address token,
        uint256 minDeposit,
        uint256 maxDeposit
    ) external override onlyRole(DEFAULT_ADMIN_ROLE) validAddress(token) {
        require(!tokenInfo[token].isWhitelisted, "Token already whitelisted");
        require(minDeposit > 0, "Min deposit must be > 0");
        require(maxDeposit >= minDeposit, "Max must be >= min");

        tokenInfo[token] = TokenInfo({
            isWhitelisted: true,
            minDeposit: minDeposit,
            maxDeposit: maxDeposit,
            totalDeposited: 0
        });

        emit TokenWhitelisted(token, minDeposit, maxDeposit);
    }

    function removeTokenFromWhitelist(address token) 
        external 
        override 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(tokenInfo[token].isWhitelisted, "Token not whitelisted");
        
        tokenInfo[token].isWhitelisted = false;
        
        emit TokenRemovedFromWhitelist(token);
    }

    function isTokenWhitelisted(address token) external view override returns (bool) {
        return tokenInfo[token].isWhitelisted;
    }

    function getTokenInfo(address token) external view override returns (TokenInfo memory) {
        return tokenInfo[token];
    }

    // Staking Functions
    function depositToken(address token, uint256 amount) 
        external 
        override 
        nonReentrant 
        whenNotPaused 
    {
        require(tokenInfo[token].isWhitelisted, "Token not whitelisted");
        require(amount >= tokenInfo[token].minDeposit, "Below minimum deposit");
        
        uint256 userTotal = userDeposits[msg.sender][token] + amount;
        require(userTotal <= tokenInfo[token].maxDeposit, "Exceeds maximum deposit");

        // Transfer tokens from user to MultiSig
        IERC20(token).safeTransferFrom(msg.sender, multiSigWallet, amount);

        // Update user records
        userDeposits[msg.sender][token] += amount;
        tokenInfo[token].totalDeposited += amount;
        
        if (!userHasToken[msg.sender][token]) {
            userTokenList[msg.sender].push(token);
            userHasToken[msg.sender][token] = true;
        }

        stakingRecords[msg.sender][token] = StakingRecord({
            amount: userDeposits[msg.sender][token],
            timestamp: getTimestamp(),
            lastRewardClaim: getTimestamp()
        });

        emit TokensDeposited(msg.sender, token, amount, getTimestamp());
    }

    function depositETH() external payable override nonReentrant whenNotPaused {
        require(msg.value > 0, "Must send ETH");
        require(tokenInfo[wethAddress].isWhitelisted, "WETH not whitelisted");
        require(msg.value >= tokenInfo[wethAddress].minDeposit, "Below minimum deposit");
        
        uint256 userTotal = userDeposits[msg.sender][wethAddress] + msg.value;
        require(userTotal <= tokenInfo[wethAddress].maxDeposit, "Exceeds maximum deposit");

        // Wrap ETH to WETH
        IWETH(wethAddress).deposit{value: msg.value}();
        
        // Transfer WETH to MultiSig
        IWETH(wethAddress).transfer(multiSigWallet, msg.value);

        // Update user records
        userDeposits[msg.sender][wethAddress] += msg.value;
        tokenInfo[wethAddress].totalDeposited += msg.value;
        
        if (!userHasToken[msg.sender][wethAddress]) {
            userTokenList[msg.sender].push(wethAddress);
            userHasToken[msg.sender][wethAddress] = true;
        }

        stakingRecords[msg.sender][wethAddress] = StakingRecord({
            amount: userDeposits[msg.sender][wethAddress],
            timestamp: getTimestamp(),
            lastRewardClaim: getTimestamp()
        });

        emit ETHDeposited(msg.sender, msg.value, getTimestamp());
    }

    function getStakingRecord(address user, address token) 
        external 
        view 
        override 
        returns (uint256 amount, uint256 timestamp) 
    {
        StakingRecord memory record = stakingRecords[user][token];
        return (record.amount, record.timestamp);
    }

    function getUserTokenBalance(address user, address token) 
        external 
        view 
        override 
        returns (uint256) 
    {
        return userDeposits[user][token];
    }

    function getUserTokens(address user) external view override returns (address[] memory) {
        return userTokenList[user];
    }

    // Withdrawal Functions
    function allocateWithdrawal(
        address user,
        address token,
        uint256 amount,
        uint256 nonce
    ) external override onlyRole(ADMIN_ROLE) whenNotPaused returns (uint256 withdrawalId) {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be > 0");
        require(!usedNonces[nonce], "Nonce already used");
        require(userDeposits[user][token] >= amount, "Insufficient user balance");

        usedNonces[nonce] = true;
        withdrawalId = ++withdrawalCounter;

        withdrawalRequests[withdrawalId] = WithdrawalRequest({
            user: user,
            token: token,
            amount: amount,
            nonce: nonce,
            timestamp: getTimestamp(),
            processed: false,
            cancelled: false
        });

        // Reduce user's staking balance
        userDeposits[user][token] -= amount;
        stakingRecords[user][token].amount = userDeposits[user][token];

        emit WithdrawalAllocated(withdrawalId, user, token, amount);
    }

    function cancelWithdrawal(uint256 withdrawalId) 
        external 
        override 
        onlyRole(ADMIN_ROLE) 
    {
        WithdrawalRequest storage request = withdrawalRequests[withdrawalId];
        require(request.timestamp > 0, "Withdrawal does not exist");
        require(!request.processed, "Already processed");
        require(!request.cancelled, "Already cancelled");

        request.cancelled = true;

        // Restore user's balance
        userDeposits[request.user][request.token] += request.amount;
        stakingRecords[request.user][request.token].amount = userDeposits[request.user][request.token];

        emit WithdrawalCancelled(withdrawalId, msg.sender);
    }

    function processWithdrawal(uint256 withdrawalId) external override nonReentrant {
        WithdrawalRequest storage request = withdrawalRequests[withdrawalId];
        require(request.timestamp > 0, "Withdrawal does not exist");
        require(!request.processed, "Already processed");
        require(!request.cancelled, "Withdrawal cancelled");
        require(msg.sender == request.user || hasRole(ADMIN_ROLE, msg.sender), "Unauthorized");

        request.processed = true;

        // Note: Actual transfer happens from MultiSig wallet
        // This function just marks the withdrawal as processed
        
        emit WithdrawalProcessed(withdrawalId, request.user, request.amount);
    }

    function getWithdrawalRequest(uint256 withdrawalId) 
        external 
        view 
        override 
        returns (WithdrawalRequest memory) 
    {
        return withdrawalRequests[withdrawalId];
    }

    // Admin Functions
    function emergencyWithdrawAll(address token) 
        external 
        override 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        uint256 amount;
        
        if (token == address(0)) {
            // Withdraw ETH
            amount = address(this).balance;
            require(amount > 0, "No ETH to withdraw");
            payable(msg.sender).sendValue(amount);
        } else {
            // Withdraw ERC20
            amount = IERC20(token).balanceOf(address(this));
            require(amount > 0, "No tokens to withdraw");
            IERC20(token).safeTransfer(msg.sender, amount);
        }

        emit EmergencyWithdraw(token, amount, msg.sender);
    }

    function updateMultiSigWallet(address newMultiSig) 
        external 
        override 
        onlyRole(DEFAULT_ADMIN_ROLE) 
        validAddress(newMultiSig) 
    {
        require(newMultiSig != multiSigWallet, "Same address");
        
        address oldMultiSig = multiSigWallet;
        multiSigWallet = newMultiSig;
        
        emit MultiSigUpdated(oldMultiSig, newMultiSig);
    }

    function pause() external override onlyRole(PAUSER_ROLE) {
        _pause();
        emit ContractPaused(msg.sender);
    }

    function unpause() external override onlyRole(PAUSER_ROLE) {
        _unpause();
        emit ContractUnpaused(msg.sender);
    }

    // Testnet Mock Functions
    function mintTestTokens(address token, uint256 amount, address recipient) 
        external 
        override 
        onlyTestnet 
        onlyRole(ADMIN_ROLE) 
    {
        require(tokenInfo[token].isWhitelisted, "Token not whitelisted");
        
        // Note: This assumes test tokens have a mint function
        // In real implementation, use interface for test tokens
        
        emit TestTokensMinted(token, amount, recipient);
    }

    function fastForwardTime(uint256 _seconds) 
        external 
        override 
        onlyTestnet 
        onlyRole(ADMIN_ROLE) 
    {
        require(_seconds > 0 && _seconds <= 365 days, "Invalid time period");
        
        mockTimestamp += _seconds;
        
        emit TimeAdvanced(_seconds, getTimestamp());
    }

    function setMockPrice(address token, uint256 price) 
        external 
        override 
        onlyTestnet 
        onlyRole(ADMIN_ROLE) 
    {
        require(tokenInfo[token].isWhitelisted, "Token not whitelisted");
        
        mockPrices[token] = price;
        
        emit MockPriceSet(token, price);
    }

    function simulateUserActions(ActionData[] calldata actions, uint256 randomSeed) 
        external 
        override 
        onlyTestnet 
        onlyRole(ADMIN_ROLE) 
    {
        require(actions.length > 0 && actions.length < 100, "Invalid actions length");
        
        uint256 executed = 0;
        
        for (uint256 i = 0; i < actions.length; i++) {
            // Simulate deposits/withdrawals
            // Implementation depends on test token setup
            executed++;
        }
        
        emit SimulationCompleted(executed, randomSeed);
    }

    function resetContractState() 
        external 
        override 
        onlyTestnet 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        // Reset all mappings and counters
        withdrawalCounter = 0;
        mockTimestamp = 0;
        
        // Note: In production, would need to iterate and clear all mappings
        
        emit ContractReset(msg.sender, getTimestamp());
    }

    // View Functions
    function totalDeposited(address token) external view override returns (uint256) {
        return tokenInfo[token].totalDeposited;
    }

    function isTestnet() public view override returns (bool) {
        uint256 chainId = block.chainid;
        return chainId != 1; // Not mainnet
    }

    function getTimestamp() private view returns (uint256) {
        if (isTestnet() && mockTimestamp > 0) {
            return block.timestamp + mockTimestamp;
        }
        return block.timestamp;
    }

    // Receive function to accept ETH
    receive() external payable {
        revert("Use depositETH() to deposit ETH");
    }
}