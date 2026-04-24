export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
] as const;

export const SPLITPAY_ABI = [
  {
    type: "function",
    name: "createSplit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "totalAmount", type: "uint128" },
      { name: "participantCount", type: "uint32" },
      { name: "splitType", type: "uint8" },
      { name: "title", type: "string" },
    ],
    outputs: [{ name: "splitId", type: "uint256" }],
  },
  {
    type: "function",
    name: "payShare",
    stateMutability: "nonpayable",
    inputs: [
      { name: "splitId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getShareAmount",
    stateMutability: "view",
    inputs: [
      { name: "splitId", type: "uint256" },
      { name: "payer", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getSplitDetails",
    stateMutability: "view",
    inputs: [{ name: "splitId", type: "uint256" }],
    outputs: [
      { name: "creator", type: "address" },
      { name: "totalAmount", type: "uint256" },
      { name: "paidAmount", type: "uint256" },
      { name: "participantCount", type: "uint32" },
      { name: "paidCount", type: "uint32" },
      { name: "splitType", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "hasPaid",
    stateMutability: "view",
    inputs: [
      { name: "splitId", type: "uint256" },
      { name: "payer", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "getPayers",
    stateMutability: "view",
    inputs: [{ name: "splitId", type: "uint256" }],
    outputs: [{ type: "address[]" }],
  },
  {
    type: "event",
    name: "SplitCreated",
    inputs: [
      { name: "splitId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "totalAmount", type: "uint256", indexed: false },
      { name: "participantCount", type: "uint32", indexed: false },
      { name: "splitType", type: "uint8", indexed: false },
      { name: "title", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SharePaid",
    inputs: [
      { name: "splitId", type: "uint256", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "paidAmount", type: "uint256", indexed: false },
      { name: "paidCount", type: "uint32", indexed: false },
    ],
  },
] as const;

export const SplitTypeEnum = { equal: 0, custom: 1 } as const;
