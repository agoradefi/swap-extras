import * as dotenv from "dotenv";

import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.6.6",
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999,
      },
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.FORK_URL || "https://andromeda.metis.io/?owner=1088",
        blockNumber: 1298696,
      },
    },
    metis: {
      url: process.env.METIS_RPC || "https://andromeda.metis.io/?owner=1088",
      accounts: [process.env.PRIVATE_KEY || ""],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
