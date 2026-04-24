// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title SplitPay
 * @notice Split a bill across multiple participants. Each participant pays their
 *         share in USDC (or any ERC20). Funds are forwarded directly to the creator.
 *
 *         Two split types are supported:
 *           - EQUAL  : `totalAmount` is divided across `participantCount` evenly.
 *                      Any rounding remainder is paid by the LAST participant.
 *           - CUSTOM : Each participant pays whatever amount they want, until the
 *                      total reaches `totalAmount`. The last payer covers any
 *                      remaining balance.
 *
 *         A split is "complete" once `paidAmount == totalAmount` OR
 *         `paidCount == participantCount`.
 */
contract SplitPay {
    enum SplitType { EQUAL, CUSTOM }

    struct Split {
        address creator;
        uint128 totalAmount;
        uint128 paidAmount;
        uint32  participantCount;
        uint32  paidCount;
        SplitType splitType;
        bool exists;
    }

    IERC20 public immutable token;

    uint256 public nextSplitId;

    mapping(uint256 => Split) private _splits;
    mapping(uint256 => mapping(address => bool)) public hasPaid;
    mapping(uint256 => mapping(address => uint256)) public paidAmountBy;
    mapping(uint256 => address[]) private _payers;

    event SplitCreated(
        uint256 indexed splitId,
        address indexed creator,
        uint256 totalAmount,
        uint32 participantCount,
        SplitType splitType,
        string title
    );

    event SharePaid(
        uint256 indexed splitId,
        address indexed payer,
        uint256 amount,
        uint256 paidAmount,
        uint32 paidCount
    );

    event SplitCompleted(uint256 indexed splitId);

    error SplitDoesNotExist();
    error AlreadyPaid();
    error SplitFull();
    error AmountTooLarge();
    error AmountRequired();
    error TransferFailed();

    constructor(address tokenAddress) {
        token = IERC20(tokenAddress);
    }

    function createSplit(
        uint128 totalAmount,
        uint32 participantCount,
        SplitType splitType,
        string calldata title
    ) external returns (uint256 splitId) {
        require(totalAmount > 0, "totalAmount=0");
        require(participantCount > 0, "participantCount=0");

        splitId = nextSplitId++;
        _splits[splitId] = Split({
            creator: msg.sender,
            totalAmount: totalAmount,
            paidAmount: 0,
            participantCount: participantCount,
            paidCount: 0,
            splitType: splitType,
            exists: true
        });

        emit SplitCreated(splitId, msg.sender, totalAmount, participantCount, splitType, title);
    }

    function payShare(uint256 splitId, uint256 amount) external {
        Split storage s = _splits[splitId];
        if (!s.exists) revert SplitDoesNotExist();
        if (hasPaid[splitId][msg.sender]) revert AlreadyPaid();
        if (s.paidCount >= s.participantCount) revert SplitFull();
        if (amount == 0) revert AmountRequired();

        uint256 remaining = uint256(s.totalAmount) - uint256(s.paidAmount);
        if (amount > remaining) revert AmountTooLarge();

        if (s.splitType == SplitType.EQUAL) {
            uint256 expected = _equalShareFor(s, msg.sender);
            require(amount == expected, "wrong amount");
        }

        bool ok = token.transferFrom(msg.sender, s.creator, amount);
        if (!ok) revert TransferFailed();

        hasPaid[splitId][msg.sender] = true;
        paidAmountBy[splitId][msg.sender] = amount;
        _payers[splitId].push(msg.sender);

        unchecked {
            s.paidAmount += uint128(amount);
            s.paidCount += 1;
        }

        emit SharePaid(splitId, msg.sender, amount, s.paidAmount, s.paidCount);

        if (s.paidAmount >= s.totalAmount || s.paidCount >= s.participantCount) {
            emit SplitCompleted(splitId);
        }
    }

    function _equalShareFor(Split storage s, address /*payer*/) internal view returns (uint256) {
        uint256 base = uint256(s.totalAmount) / s.participantCount;
        bool isLast = (s.paidCount + 1 == s.participantCount);
        if (!isLast) return base;
        return uint256(s.totalAmount) - uint256(s.paidAmount);
    }

    function getShareAmount(uint256 splitId, address /*payer*/) external view returns (uint256) {
        Split storage s = _splits[splitId];
        if (!s.exists) revert SplitDoesNotExist();
        if (s.splitType == SplitType.EQUAL) {
            return _equalShareFor(s, address(0));
        }
        return uint256(s.totalAmount) - uint256(s.paidAmount);
    }

    function getSplitDetails(uint256 splitId)
        external
        view
        returns (
            address creator,
            uint256 totalAmount,
            uint256 paidAmount,
            uint32 participantCount,
            uint32 paidCount,
            SplitType splitType
        )
    {
        Split storage s = _splits[splitId];
        if (!s.exists) revert SplitDoesNotExist();
        return (s.creator, s.totalAmount, s.paidAmount, s.participantCount, s.paidCount, s.splitType);
    }

    function getPayers(uint256 splitId) external view returns (address[] memory) {
        if (!_splits[splitId].exists) revert SplitDoesNotExist();
        return _payers[splitId];
    }
}
