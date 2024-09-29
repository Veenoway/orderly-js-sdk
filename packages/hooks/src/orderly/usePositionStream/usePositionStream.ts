import { account, positions } from "@orderly.network/perp";
import {
  AlgoOrderRootType,
  type API,
  OrderEntity,
  OrderStatus,
} from "@orderly.network/types";
import { Decimal, zero } from "@orderly.network/utils";
import { pathOr, propOr } from "ramda";
import { useEffect, useMemo, useState } from "react";
import { type SWRConfiguration } from "swr";
import { usePrivateQuery } from "../../usePrivateQuery";
import { createGetter } from "../../utils/createGetter";
import { parseHolding } from "../../utils/parseHolding";
import { useOrderStream } from "../orderlyHooks";
import { useFundingRates } from "../useFundingRates";
import { useMarketsStream } from "../useMarketsStream";
import { useMarkPricesStream } from "../useMarkPricesStream";
import { useSymbolsInfo } from "../useSymbolsInfo";
import { findPositionTPSLFromOrders, findTPSLFromOrder } from "./utils";

type PriceMode = "markPrice" | "lastPrice";

export interface PositionReturn {
  data: any[];
  loading: boolean;
  close: (
    order: Pick<OrderEntity, "order_type" | "order_price" | "side">
  ) => void;
}

export const usePositionStream = (
  /**
   * If symbol is passed, only the position of that symbol will be returned.
   */
  symbol?: string,
  options?: SWRConfiguration & {
    calcMode?: PriceMode;
    /**
     * If true, the pending order will be included in the result.
     */
    includedPendingOrder?: boolean;
  }
) => {
  const symbolInfo = useSymbolsInfo();

  const { includedPendingOrder = false } = options || {};

  const { data: accountInfo } =
    usePrivateQuery<API.AccountInfo>("/v1/client/info");

  const { data: holding } = usePrivateQuery<API.Holding[]>(
    "/v1/client/holding",
    {
      formatter: (data) => {
        return data.holding;
      },
    }
  );

  const fundingRates = useFundingRates();

  const {
    data,
    error,
    mutate: refreshPositions,
  } = usePrivateQuery<API.PositionInfo>(`/v1/positions`, {
    // revalidateOnFocus: false,
    // revalidateOnReconnect: false,
    // dedupingInterval: 200,
    // keepPreviousData: false,
    // revalidateIfStale: true,
    ...options,

    formatter: (data) => data,
    onError: (err) => {},
  });

  const { data: markPrices } = useMarkPricesStream();

  // get TP/SL orders;

  const [tpslOrders, { refresh }] = useOrderStream({
    status: OrderStatus.INCOMPLETE,
    includes: [AlgoOrderRootType.POSITIONAL_TP_SL, AlgoOrderRootType.TP_SL],
  });
  //

  // Refresh Algo orders from useOrderStream & active position from "v1/positions"
  const refreshAlgoAndPosition = () => {
    refresh();
    refreshPositions();
  };

  // console.log("---------------");

  const [priceMode, setPriceMode] = useState(options?.calcMode || "markPrice");

  useEffect(() => {
    if (options?.calcMode && priceMode !== options?.calcMode) {
      setPriceMode(options?.calcMode);
    }
  }, [options?.calcMode]);

  const { data: tickers } = useMarketsStream();

  const tickerPrices = useMemo(() => {
    const data: Record<string, number> = Object.create(null);
    tickers?.forEach((item) => {
      // @ts-ignore
      data[item.symbol] = item["24h_close"];
    });
    return data;
  }, [tickers]);

  const formatedPositions = useMemo<[API.PositionExt[], any] | null>(() => {
    if (!data?.rows || symbolInfo.isNil || !accountInfo) return null;

    const filteredData =
      typeof symbol === "undefined" || symbol === ""
        ? data.rows
        : data.rows.filter((item) => {
            return item.symbol === symbol;
          });

    let unrealPnL_total = zero,
      notional_total = zero,
      unsettlementPnL_total = zero;

    const formatted = filteredData.map((item: API.Position) => {
      // const price = (markPrices as any)[item.symbol] ?? item.mark_price;
      const unRealizedPrice = propOr(
        item.mark_price,
        item.symbol,
        priceMode === "markPrice" ? markPrices : tickerPrices
      ) as unknown as number;

      const price = propOr(
        item.mark_price,
        item.symbol,
        markPrices
      ) as unknown as number;

      const info = symbolInfo[item.symbol];
      //

      const notional = positions.notional(item.position_qty, price);

      const unrealPnl = positions.unrealizedPnL({
        qty: item.position_qty,
        openPrice: item?.average_open_price,
        markPrice: unRealizedPrice,
      });

      const imr = account.IMR({
        maxLeverage: accountInfo.max_leverage,
        baseIMR: info("base_imr"),
        IMR_Factor: accountInfo.imr_factor[item.symbol] as number,
        positionNotional: notional,
        ordersNotional: 0,
        IMR_factor_power: 4 / 5,
      });

      const unrealPnlROI = positions.unrealizedPnLROI({
        positionQty: item.position_qty,
        openPrice: item.average_open_price,
        IMR: imr,
        unrealizedPnL: unrealPnl,
      });

      const unsettlementPnL = positions.unsettlementPnL({
        positionQty: item.position_qty,
        markPrice: price,
        costPosition: item.cost_position,
        sumUnitaryFunding: fundingRates[item.symbol]?.(
          "sum_unitary_funding",
          0
        ),
        lastSumUnitaryFunding: item.last_sum_unitary_funding,
      });

      unrealPnL_total = unrealPnL_total.add(unrealPnl);
      notional_total = notional_total.add(notional);
      unsettlementPnL_total = unsettlementPnL_total.add(unsettlementPnL);

      return {
        ...item,
        mark_price: price,
        mm: 0,
        notional,
        unsettlement_pnl: unsettlementPnL,
        unrealized_pnl: unrealPnl,
        unrealized_pnl_ROI: unrealPnlROI,
      };
    });

    return [
      formatted,
      {
        unrealPnL: unrealPnL_total.toNumber(),
        notional: notional_total.toNumber(),
        unsettledPnL: unsettlementPnL_total.toNumber(),
      },
    ];
  }, [
    data?.rows,
    symbolInfo,
    accountInfo,
    markPrices,
    priceMode,
    tickerPrices,
    symbol,
    holding,
  ]);

  // const showSymbol = useCallback((symbol: string) => {
  //   setVisibleSymbol(symbol);
  // }, []);

  const [totalCollateral, totalValue, totalUnrealizedROI] = useMemo<
    [Decimal, Decimal, number]
  >(() => {
    if (!holding || !markPrices) {
      return [zero, zero, 0];
    }
    const unsettlemnedPnL = pathOr(0, [1, "unsettledPnL"])(formatedPositions);
    const unrealizedPnL = pathOr(0, [1, "unrealPnL"])(formatedPositions);

    const [USDC_holding, nonUSDC] = parseHolding(holding, markPrices);

    const totalCollateral = account.totalCollateral({
      USDCHolding: USDC_holding,
      nonUSDCHolding: nonUSDC,
      unsettlementPnL: unsettlemnedPnL,
    });

    const totalValue = account.totalValue({
      totalUnsettlementPnL: unsettlemnedPnL,
      USDCHolding: USDC_holding,
      nonUSDCHolding: nonUSDC,
    });

    const totalUnrealizedROI = account.totalUnrealizedROI({
      totalUnrealizedPnL: unrealizedPnL,
      totalValue: totalValue.toNumber(),
    });

    return [totalCollateral, totalValue, totalUnrealizedROI];
  }, [holding, formatedPositions, markPrices]);

  const positionsRows = useMemo<API.PositionTPSLExt[] | null>(() => {
    if (!formatedPositions) return null;

    if (!symbolInfo || !accountInfo) return formatedPositions[0];

    const total = totalCollateral.toNumber();

    let rows = formatedPositions[0];

    if (!includedPendingOrder) {
      rows = rows.filter((item) => item.position_qty !== 0);
    } else {
      rows = rows.filter(
        (item) =>
          item.position_qty !== 0 ||
          item.pending_long_qty !== 0 ||
          item.pending_short_qty !== 0
      );
    }
    // .filter((item) => item.position_qty !== 0)
    rows = rows.map((item) => {
      const info = symbolInfo?.[item.symbol];

      const related_order = Array.isArray(tpslOrders)
        ? findPositionTPSLFromOrders(tpslOrders, item.symbol)
        : undefined;

      const tp_sl_pricer = !!related_order
        ? findTPSLFromOrder(related_order)
        : undefined;

      const MMR = positions.MMR({
        baseMMR: info("base_mmr"),
        baseIMR: info("base_imr"),
        IMRFactor: accountInfo.imr_factor[item.symbol] as number,
        positionNotional: item.notional,
        IMR_factor_power: 4 / 5,
      });

      return {
        ...item,
        mm: positions.maintenanceMargin({
          positionQty: item.position_qty,
          markPrice: item.mark_price,
          MMR,
        }),
        tp_trigger_price: tp_sl_pricer?.tp_trigger_price,
        sl_trigger_price: tp_sl_pricer?.sl_trigger_price,

        mmr: MMR,

        // has_position_tp_sl:
        //   !tp_sl_pricer?.sl_trigger_price && !tp_sl_pricer?.tp_trigger_price,
        algo_order: related_order,
      };
    });

    // calculate est_liq_price
    rows = rows.map((item) => {
      const est_liq_price = positions.liqPrice({
        markPrice: item.mark_price,
        totalCollateral: total,
        positionQty: item.position_qty,
        positions: rows,
        MMR: item.mmr,
      });
      return {
        ...item,
        est_liq_price,
      };
    });

    return rows;
  }, [formatedPositions, symbolInfo, accountInfo, totalCollateral, tpslOrders]);

  const positionInfoGetter = createGetter<
    Omit<API.PositionInfo, "rows">,
    keyof Omit<API.PositionInfo, "rows">
  >(data as any, 1);

  return [
    {
      rows: positionsRows,
      aggregated: {
        ...(formatedPositions?.[1] ?? {}),
        unrealPnlROI: totalUnrealizedROI,
      },
      totalCollateral,
      totalValue,
      totalUnrealizedROI,
    },
    positionInfoGetter,
    {
      // close: onClosePosition,
      loading: false,
      // showSymbol,
      error,
      // loadMore: () => {},
      // Replace refresh function from v1/positions with new refresh function
      refresh: refreshAlgoAndPosition,
    },
  ] as const;
};

export const pathOr_unsettledPnLPathOr = pathOr(0, [
  0,
  "aggregated",
  "unsettledPnL",
]);
