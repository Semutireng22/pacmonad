export const GAMES_ID_ABI = [
  {
    "type":"function",
    "name":"updatePlayerData",
    "stateMutability":"nonpayable",
    "inputs":[
      {"name":"player","type":"address"},
      {"name":"scoreAmount","type":"uint256"},
      {"name":"transactionAmount","type":"uint256"}
    ],
    "outputs":[]
  },
  {
    "type":"function",
    "name":"registerGame",
    "stateMutability":"nonpayable",
    "inputs":[
      {"name":"_game","type":"address"},
      {"name":"_name","type":"string"},
      {"name":"_image","type":"string"},
      {"name":"_url","type":"string"}
    ],
    "outputs":[]
  }
] as const;