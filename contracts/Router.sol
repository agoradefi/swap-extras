pragma solidity =0.6.6;

import "./lib/TransferHelper.sol";
import "./lib/SafeMath.sol";

interface ICToken {
    function underlying() external returns (address);

    function balanceOf(address owner) external view returns (uint256);

    function exchangeRateCurrent() external returns (uint256);

    function mint(uint256 mintAmount) external returns (uint256);

    function redeem(uint256 redeemTokens) external returns (uint256);
}

interface IUniRouter {
    function getAmountsIn(uint256 amountOut, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        );

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

interface IERC20 {
    function balanceOf(address owner) external view returns (uint256);
}

contract Router {
    using SafeMath for uint256;

    IUniRouter public immutable uniRouter;

    constructor(address _uniRouter) public {
        uniRouter = IUniRouter(_uniRouter);
    }

    modifier onlyEOA() {
        require(tx.origin == msg.sender, "Router: Only EOA");
        _;
    }

    function mintCTokensAddLiquidity(
        ICToken _cTokenA,
        ICToken _cTokenB,
        uint256 _amountA,
        uint256 _amountB,
        uint256 _minAmtCTokenA,
        uint256 _minAmtCTokenB
    ) external onlyEOA {
        uint256 err;

        address underlyingA = _cTokenA.underlying();
        TransferHelper.safeTransferFrom(
            underlyingA,
            msg.sender,
            address(this),
            _amountA
        );
        TransferHelper.safeApprove(underlyingA, address(_cTokenA), _amountA);
        err = _cTokenA.mint(_amountA);
        require(err == 0, "Router: CTokenA mint failed");

        address underlyingB = _cTokenB.underlying();
        TransferHelper.safeTransferFrom(
            underlyingB,
            msg.sender,
            address(this),
            _amountB
        );
        TransferHelper.safeApprove(underlyingB, address(_cTokenB), _amountB);
        err = _cTokenB.mint(_amountB);
        require(err == 0, "Router: CTokenB mint failed");

        uint256 balCTokenA = _cTokenA.balanceOf(address(this));
        uint256 balCTokenB = _cTokenB.balanceOf(address(this));
        TransferHelper.safeApprove(
            address(_cTokenA),
            address(uniRouter),
            balCTokenA
        );
        TransferHelper.safeApprove(
            address(_cTokenB),
            address(uniRouter),
            balCTokenB
        );
        uniRouter.addLiquidity(
            address(_cTokenA),
            address(_cTokenB),
            balCTokenA,
            balCTokenB,
            _minAmtCTokenA + 1,
            _minAmtCTokenB + 1,
            msg.sender,
            block.timestamp
        );
    }

    function removeLiquidityRedeemCTokens(
        ICToken _cTokenA,
        ICToken _cTokenB,
        address pair,
        uint256 _liquidity,
        uint256 _minAmtCTokenA,
        uint256 _minAmtCTokenB
    ) external onlyEOA {
        address underlyingA = _cTokenA.underlying();
        address underlyingB = _cTokenB.underlying();

        TransferHelper.safeTransferFrom(
            pair,
            msg.sender,
            address(this),
            _liquidity
        );
        TransferHelper.safeApprove(pair, address(uniRouter), _liquidity);
        (uint256 amountA, uint256 amountB) = uniRouter.removeLiquidity(
            address(_cTokenA),
            address(_cTokenB),
            _liquidity,
            _minAmtCTokenA + 1,
            _minAmtCTokenB + 1,
            address(this),
            block.timestamp
        );

        uint256 err;
        err = _cTokenA.redeem(amountA);
        require(err == 0, "Router: CTokenA redeem failed");
        TransferHelper.safeTransfer(
            underlyingA,
            msg.sender,
            IERC20(underlyingA).balanceOf(address(this))
        );

        err = _cTokenB.redeem(amountB);
        require(err == 0, "Router: CTokenB redeem failed");
        TransferHelper.safeTransfer(
            underlyingB,
            msg.sender,
            IERC20(underlyingB).balanceOf(address(this))
        );
    }

    function swapExactTokensForTokens(
        uint256 _amountIn,
        uint256 _amountOutMin,
        address[] calldata _cTokenPath
    ) external onlyEOA {
        uint256 err;

        ICToken cTokenFrom = ICToken(_cTokenPath[0]);
        address underlyingFrom = cTokenFrom.underlying();
        TransferHelper.safeTransferFrom(
            underlyingFrom,
            msg.sender,
            address(this),
            _amountIn
        );
        TransferHelper.safeApprove(
            underlyingFrom,
            address(cTokenFrom),
            _amountIn
        );
        err = cTokenFrom.mint(_amountIn);
        require(err == 0, "Router: CToken mint failed");

        uint256 balCTokenFrom = cTokenFrom.balanceOf(address(this));
        TransferHelper.safeApprove(
            address(cTokenFrom),
            address(uniRouter),
            balCTokenFrom
        );
        uint256[] memory outAmounts = uniRouter.swapExactTokensForTokens(
            balCTokenFrom,
            _amountOutMin + 1,
            _cTokenPath,
            address(this),
            block.timestamp
        );

        ICToken cTokenTo = ICToken(_cTokenPath[_cTokenPath.length - 1]);
        address underlyingTo = cTokenTo.underlying();
        err = cTokenTo.redeem(outAmounts[outAmounts.length - 1]);
        require(err == 0, "Router: CToken redeem failed");
        TransferHelper.safeTransfer(
            underlyingTo,
            msg.sender,
            IERC20(underlyingTo).balanceOf(address(this))
        );
    }

    function swapTokensForExactTokens(
        uint256 _amountOut,
        uint256 _amountInMax,
        address[] calldata _cTokenPath
    ) external onlyEOA {
        ICToken cTokenTo = ICToken(_cTokenPath[_cTokenPath.length - 1]);
        uint256 amountOutCToken = _amountOut.mul(1e18) /
            cTokenTo.exchangeRateCurrent();

        uint256[] memory amounts = uniRouter.getAmountsIn(
            amountOutCToken,
            _cTokenPath
        );
        uint256 amountInCToken = amounts[amounts.length - 1];

        ICToken cTokenFrom = ICToken(_cTokenPath[0]);
        uint256 amountIn = amountInCToken.mul(
            cTokenFrom.exchangeRateCurrent()
        ) / 1e18;

        uint256 err;

        address underlyingFrom = cTokenFrom.underlying();
        TransferHelper.safeTransferFrom(
            underlyingFrom,
            msg.sender,
            address(this),
            amountIn
        );
        TransferHelper.safeApprove(
            underlyingFrom,
            address(cTokenFrom),
            amountIn
        );
        err = cTokenFrom.mint(amountIn);
        require(err == 0, "Router: CToken mint failed");

        TransferHelper.safeApprove(
            address(cTokenFrom),
            address(uniRouter),
            amountInCToken
        );
        uint256[] memory outAmounts = uniRouter.swapTokensForExactTokens(
            amountOutCToken,
            _amountInMax - 1,
            _cTokenPath,
            address(this),
            block.timestamp
        );

        address underlyingTo = cTokenTo.underlying();
        err = cTokenTo.redeem(outAmounts[outAmounts.length - 1]);
        require(err == 0, "Router: CToken redeem failed");
        TransferHelper.safeTransfer(
            underlyingTo,
            msg.sender,
            IERC20(underlyingTo).balanceOf(address(this))
        );
    }

    function burn(address _token) external onlyEOA {
        TransferHelper.safeTransfer(
            _token,
            address(1),
            IERC20(_token).balanceOf(address(this))
        );
    }
}
