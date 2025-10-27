// SPDX-License-Identifier: MIT
// File: SimpleERC20WithERC3009.sol

pragma solidity ^0.8.20;

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/**
 * @dev Interface for the optional metadata functions from the ERC-20 standard.
 */
interface IERC20Metadata is IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

/**
 * Simple ERC-20 token with ERC-3009 "Transfer With Authorization" support.
 * Fully compatible with ERC-20 standard and MetaMask.
 *
 * - EIP-712 domain separator includes name, version, chainId, verifyingContract
 * - Random 32-byte nonces tracked per authorizer to prevent replay
 * - Supports transferWithAuthorization, receiveWithAuthorization, cancelAuthorization
 *
 * Security notes:
 * - Prefer receiveWithAuthorization when calling from contracts to prevent front-running
 * - Reject zero address in ecrecover via explicit check
 * - Validate validAfter/validBefore window using block.timestamp
 */
contract SimpleERC20WithERC3009 is IERC20, IERC20Metadata {
    // --- ERC-20 core storage ---
    string public override name;
    string public override symbol;
    uint8 public immutable override decimals;
    uint256 public override totalSupply;

    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    // --- EIP-712 / ERC-3009 ---
    bytes32 public DOMAIN_SEPARATOR;
    string public constant EIP712_VERSION = "1";

    // keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
    bytes32 public constant EIP712_DOMAIN_TYPEHASH =
        0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f;

    // keccak256("TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)")
    bytes32 public constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
        0x7c7c6cdb67a18743f49ec6fa9b35f50d52ed05cbed4cc592e13b44501c1a2267;

    // keccak256("ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)")
    bytes32 public constant RECEIVE_WITH_AUTHORIZATION_TYPEHASH =
        0xd099cc98ef71107a616c4f0f941f04c322d8e254fe26b3c6668db87aae413de8;

    // keccak256("CancelAuthorization(address authorizer,bytes32 nonce)")
    bytes32 public constant CANCEL_AUTHORIZATION_TYPEHASH =
        0x158b0a9edf7a828aad02f63cd515c68ef2f50ba807396f6d12842833a1597429;

    // authorizer => nonce => used/canceled
    mapping(address => mapping(bytes32 => bool)) internal _authorizationStates;

    // --- ERC-3009 specific events (ERC-20 events are in IERC20 interface) ---
    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);
    event AuthorizationCanceled(address indexed authorizer, bytes32 indexed nonce);

    // --- Errors ---
    error InvalidSignature();
    error AuthorizationNotYetValid();
    error AuthorizationExpired();
    error AuthorizationUsedAlready();
    error InvalidRecipient();
    error ZeroAddress();

    // --- Constructor ---
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;

        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes(_name)),
                keccak256(bytes(EIP712_VERSION)),
                chainId,
                address(this)
            )
        );
    }

    // --- Minting for testing ---
    function mint(address to, uint256 amount) external {
        if (to == address(0)) revert ZeroAddress();
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    // --- ERC-20 standard functions ---
    function transfer(address to, uint256 amount) external override returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        require(currentAllowance >= amount, "ERC20: insufficient allowance");
        unchecked {
            allowance[from][msg.sender] = currentAllowance - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    // Internal transfer
    function _transfer(address from, address to, uint256 amount) internal {
        if (to == address(0)) revert ZeroAddress();
        uint256 fromBal = balanceOf[from];
        require(fromBal >= amount, "ERC20: insufficient balance");
        unchecked {
            balanceOf[from] = fromBal - amount;
        }
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }

    // --- ERC-3009 state view ---
    function authorizationState(address authorizer, bytes32 nonce) external view returns (bool) {
        return _authorizationStates[authorizer][nonce];
    }

    // --- ERC-3009: transferWithAuthorization ---
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        _validateTimeWindow(validAfter, validBefore);
        _ensureUnused(from, nonce);

        // Verify signature over typed data
        _verifyTypedSig(
            from,
            keccak256(
                abi.encode(
                    TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
                    from,
                    to,
                    value,
                    validAfter,
                    validBefore,
                    nonce
                )
            ),
            v,
            r,
            s
        );

        // Mark nonce used and transfer
        _useNonce(from, nonce);
        _transfer(from, to, value);
    }

    // --- ERC-3009: receiveWithAuthorization ---
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // Prevent front-running by requiring caller == payee
        if (to != msg.sender) revert InvalidRecipient();

        _validateTimeWindow(validAfter, validBefore);
        _ensureUnused(from, nonce);

        _verifyTypedSig(
            from,
            keccak256(
                abi.encode(
                    RECEIVE_WITH_AUTHORIZATION_TYPEHASH,
                    from,
                    to,
                    value,
                    validAfter,
                    validBefore,
                    nonce
                )
            ),
            v,
            r,
            s
        );

        _useNonce(from, nonce);
        _transfer(from, to, value);
    }

    // --- Optional: cancelAuthorization ---
    function cancelAuthorization(
        address authorizer,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // authorizer signs to cancel their own nonce; anyone can submit
        _ensureUnused(authorizer, nonce);

        _verifyTypedSig(
            authorizer,
            keccak256(
                abi.encode(
                    CANCEL_AUTHORIZATION_TYPEHASH,
                    authorizer,
                    nonce
                )
            ),
            v,
            r,
            s
        );

        _authorizationStates[authorizer][nonce] = true;
        emit AuthorizationCanceled(authorizer, nonce);
    }

    // --- Helpers ---
    function _validateTimeWindow(uint256 validAfter, uint256 validBefore) internal view {
        uint256 nowTs = block.timestamp;
        if (nowTs <= validAfter) revert AuthorizationNotYetValid();
        if (nowTs >= validBefore) revert AuthorizationExpired();
    }

    function _ensureUnused(address authorizer, bytes32 nonce) internal view {
        if (_authorizationStates[authorizer][nonce]) revert AuthorizationUsedAlready();
    }

    function _useNonce(address authorizer, bytes32 nonce) internal {
        _authorizationStates[authorizer][nonce] = true;
        emit AuthorizationUsed(authorizer, nonce);
    }

    function _verifyTypedSig(
        address expectedSigner,
        bytes32 structHash,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal view {
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address recovered = ecrecover(digest, v, r, s);
        if (recovered == address(0)) revert InvalidSignature();
        if (recovered != expectedSigner) revert InvalidSignature();
    }
}
