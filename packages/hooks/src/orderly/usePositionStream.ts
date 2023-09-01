import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivateQuery } from "../usePrivateQuery";
import { positions } from "@orderly.network/futures";

import { type SWRConfiguration } from "swr";
import { createGetter } from "../utils/createGetter";
import { useFundingRates } from "./useFundingRates";
import { type API } from "@orderly.network/types";
import { useMarkPricesSubject } from "./useMarkPricesSubject";
import { useSymbolsInfo } from "./useSymbolsInfo";
import { useMarkPricesStream } from "./useMarkPricesStream";
import { propOr } from "ramda";
import { OrderEntity } from "@orderly.network/types";
import { useMutation } from "../useMutation";
// import { useAccount } from "../useAccount";
// import { useDataSource } from "../useDataSource";

export interface PositionReturn {
  data: any[];
  loading: boolean;
  close: (
    order: Pick<OrderEntity, "order_type" | "order_price" | "side">
  ) => void;
}

export const usePositionStream = (
  symbol?: string,
  options?: SWRConfiguration
) => {
  // const [data, setData] = useState<Position[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [visibledSymbol, setVisibleSymbol] = useState<string | undefined>(
    symbol
  );

  const symbolInfo = useSymbolsInfo();
  // const { info: accountInfo } = useAccount();
  const { data: accountInfo } =
    usePrivateQuery<API.AccountInfo>("/client/info");

  const { mutation } = useMutation<OrderEntity, any>("/order");

  const fundingRates = useFundingRates();
  const markPrices$ = useMarkPricesSubject();
  // const { totalCollateral } = useCollateral();

  const { data, error, isLoading } = usePrivateQuery<API.PositionInfo>(
    `/positions`,
    {
      // revalidateOnFocus: false,
      // revalidateOnReconnect: false,
      ...options,
      formatter: (data) => data,
      onError: (err) => {
        console.log("usePositionStream error", err);
      },
    }
  );

  type PositionArray =
    | (API.Position & {
        sum_unitary_funding?: number;
      })[]
    | undefined;

  const { data: markPrices } = useMarkPricesStream();

  const formatedPositions = useMemo(() => {
    if (!data?.rows || !symbolInfo || !accountInfo) return null;

    let totalCollateral = 0;

    return data.rows.map((item: API.Position) => {
      // const price = (markPrices as any)[item.symbol] ?? item.mark_price;
      const price = propOr(
        item.mark_price,
        item.symbol,
        markPrices
      ) as unknown as number;
      const info = symbolInfo?.[item.symbol];
      // console.log("info", info("base_mmr"));

      const MMR = positions.MMR({
        baseMMR: info("base_mmr"),
        baseIMR: info("base_imr"),
        IMRFactor: accountInfo.imr_factor[info("base")] as number,
        positionNotional: positions.notional(
          item.position_qty,
          price
        ) as number,
        IMR_factor_power: 4 / 5,
      });

      // console.log("MMR", MMR);

      return {
        ...item,
        mark_price: price,
        est_liq_price: positions.liqPrice({
          markPrice: price,
          totalCollateral,
          positionQty: item.position_qty,
          MMR,
        }),
        notional: positions.notional(
          item.position_qty,
          item.average_open_price
        ),
        unrealized_pnl: positions.unrealizedPnL({
          qty: item.position_qty,
          openPrice: item.average_open_price,
          markPrice: price,
        }),
      };
    });
  }, [data?.rows, symbolInfo, accountInfo, markPrices]);

  // 合计数据
  const aggregatedData = useMemo(() => {
    const aggregatedData = {
      unsettledPnL: NaN,
      unrealPnL: NaN,
      notional: NaN,
    };

    if (formatedPositions && formatedPositions.length) {
      aggregatedData.unrealPnL =
        positions.totalUnrealizedPnL(formatedPositions);
      aggregatedData.notional = positions.totalNotional(formatedPositions);
      aggregatedData.unsettledPnL = positions.totalUnsettlementPnL(
        formatedPositions.map((item) => ({
          ...item,
          sum_unitary_funding: fundingRates[item.symbol]?.(
            "sum_unitary_funding",
            0
          ),
        }))
      );
    }

    return aggregatedData;
  }, [formatedPositions, fundingRates]);

  const showSymbol = useCallback((symbol: string) => {
    setVisibleSymbol(symbol);
  }, []);

  // console.log("usePositionStream ***", data, formatedPositions);

  const onClosePosition = useCallback(
    (order: Pick<OrderEntity, "order_type" | "order_price" | "side">) => {
      return mutation(order).finally(() => {});
    },
    []
  );

  return [
    { rows: formatedPositions, aggregated: aggregatedData },
    createGetter<Omit<API.Position, "rows">>(data as any, 1),
    {
      close: onClosePosition,
      loading: false,
      showSymbol,
      error,
      loadMore: () => {},
      refresh: () => {},
      // toggleHideOthers,
      // filter: (filter: string) => {},
    },
  ];

  // const dataSource = useDataSource();

  // useObservable(()=>dataSource.positions$,[])
};
