import { useMemo } from "react";
import { type API, OrderSide } from "@orderly.network/types";

import { useSymbolsInfo } from "./useSymbolsInfo";

import { useMarkPricesStream } from "./useMarkPricesStream";
import { account } from "@orderly.network/futures";
import { useCollateral } from "./useCollateral";

import { usePrivateQuery } from "../usePrivateQuery";
import { usePositionStream } from "./usePositionStream";
import { pathOr } from "ramda";
import { useOrderStream } from "./useOrderStream";
import { OrderStatus } from "@orderly.network/types";

const positionsPath = pathOr([], [0, "rows"]);

export const useMaxQty = (
  symbol: string,
  side: OrderSide,
  reduceOnly: boolean = false
) => {
  const positionsData = usePositionStream();

  const [orders] = useOrderStream({ status: OrderStatus.NEW });

  const { data: accountInfo } =
    usePrivateQuery<API.AccountInfo>("/v1/client/info");

  const symbolInfo = useSymbolsInfo();

  const { totalCollateral } = useCollateral();

  const { data: markPrices } = useMarkPricesStream();

  const maxQty = useMemo(() => {
    if (!symbol) return 0;

    const positions = positionsPath(positionsData);

    const positionQty = account.getQtyFromPositions(positions, symbol);

    if (reduceOnly) {
      if (positionQty > 0) {
        if (side === OrderSide.BUY) {
          return 0;
        } else {
          return Math.abs(positionQty);
        }
      }

      if (positionQty < 0) {
        if (side === OrderSide.BUY) {
          return Math.abs(positionQty);
        } else {
          return 0;
        }
      }

      return 0;
    }

    if (!markPrices || !markPrices[symbol] || !orders || !accountInfo) return 0;

    const getSymbolInfo = symbolInfo[symbol];

    // current symbol buy order quantity
    const buyOrdersQty = account.getQtyFromOrdersBySide(
      orders,
      symbol,
      OrderSide.BUY
    );
    // current symbol sell order quantity
    const sellOrdersQty = account.getQtyFromOrdersBySide(
      orders,
      symbol,
      OrderSide.SELL
    );

    const otherPositions = positions.filter(
      (item: API.Position) => item.symbol !== symbol
    );

    const otherOrders = orders.filter(
      (item: API.Order) => item.symbol !== symbol
    );

    const otherIMs = account.otherIMs({
      orders: otherOrders,
      positions: otherPositions,
      symbolInfo,
      markPrices,
      IMR_Factors: accountInfo.imr_factor,
      maxLeverage: accountInfo.max_leverage,
    });

    return account.maxQty(side, {
      markPrice: markPrices[symbol],
      symbol,
      baseMaxQty: getSymbolInfo("base_max"),
      totalCollateral,
      maxLeverage: accountInfo.max_leverage,
      takerFeeRate: accountInfo.taker_fee_rate,
      baseIMR: getSymbolInfo("base_imr"),
      otherIMs,
      positionQty,
      buyOrdersQty,
      sellOrdersQty,
      IMR_Factor: accountInfo.imr_factor[symbol],
    });
  }, [
    orders,
    positionsData,
    markPrices,
    accountInfo,
    symbolInfo,
    symbol,
    side,
    totalCollateral,
    reduceOnly,
  ]);

  return maxQty as number;
};
