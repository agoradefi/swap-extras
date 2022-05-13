import hre, { ethers } from "hardhat";
// import { expect } from "chai";
import { BigNumber } from "ethers";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { Router } from "../typechain/Router";

const Addresses = {
  // EOAs
  Deployer: "0x26b6dd12e2529946d3d5b68f867393e90cd51cce",
  User: "0xE44dB4A31be18f97647585Bf70e69973556C3C91",

  // Contracts
  UniV2Router: "0x63b48547A3A00CA8CddE2B32acB9d0d89Ee2B01c",
  kUSDC: "0x6D11F074131E3FC61C983cCe538F5D0ca3553c0F",
  kUSDT: "0x4b45B1905Cd1dC18eDad134d2E43f5043e1E157c",
  Pair: "0x9bAC88E258aE21C4ab0E3C0B80927FbCe6c8B1aA",
  USDC: "0xEA32A96608495e54156Ae48931A7c20f0dcc1a21",
  USDT: "0xbB06DCA3AE6887fAbF931640f67cab3e3a16F4dC",
};

const Abi = {
  Erc20: [
    `function approve(address, uint) public`,
    `function balanceOf(address) public view returns (uint)`,
    `function decimals() public view returns (uint8)`,
    `function symbol() public view returns (string)`,
    `event Transfer(address indexed, address indexed, uint256)`,
  ],
};

describe("Router", () => {
  let router: Router;
  let deployer: SignerWithAddress, user: SignerWithAddress;

  before(async () => {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [Addresses.Deployer],
    });
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [Addresses.User],
    });
    deployer = await ethers.getSigner(Addresses.Deployer);
    user = await ethers.getSigner(Addresses.User);

    const RouterC = await hre.ethers.getContractFactory("Router");
    router = (await RouterC.connect(deployer).deploy(
      Addresses.UniV2Router
    )) as Router;
    await router.deployed();

    let Erc20I = new hre.ethers.Contract(
      Addresses.USDC,
      Abi.Erc20,
      hre.ethers.provider
    );
    await Erc20I.connect(user).approve(
      router.address,
      ethers.constants.MaxUint256
    );

    Erc20I = new hre.ethers.Contract(
      Addresses.USDT,
      Abi.Erc20,
      hre.ethers.provider
    );
    await Erc20I.connect(user).approve(
      router.address,
      ethers.constants.MaxUint256
    );
  });

  it("mintCTokensAddLiquidity", async () => {
    const tx = await router
      .connect(user)
      .mintCTokensAddLiquidity(
        Addresses.kUSDC,
        Addresses.kUSDT,
        parseUnits("10", 6),
        parseUnits("10", 6),
        0,
        0
      );
    const txRecp = await tx.wait();
    await prettyErc20Logs(txRecp.logs);

    // const UsdcErc20I = new hre.ethers.Contract(Addresses.USDC, Abi.Erc20, hre.ethers.provider);
    // const UsdtErc20I = new hre.ethers.Contract(Addresses.USDT, Abi.Erc20, hre.ethers.provider);
    // const KUsdcErc20I = new hre.ethers.Contract(Addresses.kUSDC, Abi.Erc20, hre.ethers.provider);
    // const KUsdtErc20I = new hre.ethers.Contract(Addresses.kUSDT, Abi.Erc20, hre.ethers.provider);
    // const PairErc20I = new hre.ethers.Contract(Addresses.Pair, Abi.Erc20, hre.ethers.provider);

    // await expect(tx)
    //   .to.emit(UsdcErc20I, 'Transfer')
    //   .withArgs(user.address, router.address, parseUnits('10', 6))
    //   .to.emit(UsdcErc20I, 'Transfer')
    //   .withArgs(router.address, Addresses.kUSDC, parseUnits('10', 6))
    //   .to.emit(KUsdcErc20I, 'Transfer')
    //   .withArgs(Addresses.kUSDC, router.address, parseUnits('491.52601725', 8))
    //   .to.emit(UsdtErc20I, 'Transfer')
    //   .withArgs(user.address, router.address, parseUnits('10', 6))
    //   .to.emit(UsdtErc20I, 'Transfer')
    //   .withArgs(router.address, Addresses.kUSDT, parseUnits('10', 6))
    //   .to.emit(KUsdtErc20I, 'Transfer')
    //   .withArgs(Addresses.kUSDT, router.address, parseUnits('493.87084717', 8))
    //   .to.emit(KUsdcErc20I, 'Transfer')
    //   .withArgs(router.address, Addresses.Pair, parseUnits('491.52601725', 8))
    //   .to.emit(KUsdtErc20I, 'Transfer')
    //   .withArgs(router.address, Addresses.Pair, parseUnits('491.52601725', 8))
    //   .to.emit(PairErc20I, 'Transfer')
    //   .withArgs(ethers.constants.AddressZero, user.address, '49152601725');

    // expect(await UsdcErc20I.balanceOf(router.address)).eq(0);
    // expect(await UsdtErc20I.balanceOf(router.address)).eq(0);
    // expect(await KUsdcErc20I.balanceOf(router.address)).eq(0);
    // expect(await KUsdtErc20I.balanceOf(router.address)).eq(0);
    // expect(await PairErc20I.balanceOf(router.address)).eq(0);
  }).timeout(100000000);

  it("swapExactTokensForTokens", async () => {
    const tx = await router
      .connect(user)
      .swapExactTokensForTokens(parseUnits("1", 6), 0, [
        Addresses.kUSDC,
        Addresses.kUSDT,
      ]);
    const txRecp = await tx.wait();
    await prettyErc20Logs(txRecp.logs);
  }).timeout(100000000);

  it("swapTokensForExactTokens", async () => {
    const tx = await router
      .connect(user)
      .swapTokensForExactTokens(parseUnits("1", 6), 0, [
        Addresses.kUSDT,
        Addresses.kUSDC,
      ]);
    const txRecp = await tx.wait();
    await prettyErc20Logs(txRecp.logs);
  }).timeout(100000000);

  it("removeLiquidityRedeemCTokens", async () => {
    const Erc20I = new hre.ethers.Contract(
      Addresses.Pair,
      Abi.Erc20,
      hre.ethers.provider
    );
    const bal = await Erc20I.balanceOf(user.address);
    await Erc20I.connect(user).approve(
      router.address,
      ethers.constants.MaxUint256
    );

    const tx = await router
      .connect(user)
      .removeLiquidityRedeemCTokens(
        Addresses.kUSDC,
        Addresses.kUSDT,
        Addresses.Pair,
        bal,
        0,
        0
      );
    const txRecp = await tx.wait();
    await prettyErc20Logs(txRecp.logs);
  }).timeout(100000000);
});

const prettyErc20Logs = async (allTxLogs: any) => {
  const data = [];
  for (const log of allTxLogs) {
    if (log.topics[0] !== ethers.utils.id("Transfer(address,address,uint256)"))
      continue;

    const Erc20I = new hre.ethers.Contract(
      log.address,
      Abi.Erc20,
      hre.ethers.provider
    );
    const [decimals, symbol] = await Promise.all([
      Erc20I.decimals(),
      Erc20I.symbol(),
    ]);
    const fromAddr = ethers.utils.getAddress(log.topics[1].substring(26));
    const toAddr = ethers.utils.getAddress(log.topics[2].substring(26));
    const amount = formatUnits(BigNumber.from(log.data), decimals);
    data.push({ symbol, fromAddr, toAddr, amount });
  }
  console.table(data);
};
