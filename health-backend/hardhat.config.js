require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337
    },
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/oFQssLRZ3fxNIkR9gHXGG",
      accounts: ["d4359a0c77f2e2f27df1f9af00fe3076c94c73f43c820fafaa87d173377b190f"],
      chainId: 11155111,
      gasPrice: "auto"
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD"
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};
