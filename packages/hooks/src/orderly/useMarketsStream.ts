import { useObservable } from "rxjs-hooks";
import { useQuery } from "../useQuery";
import { useWebSocketClient } from "../useWebSocketClient";
import { withLatestFrom, map, startWith } from "rxjs/operators";
import { type WSMessage } from "@orderly.network/core";

export const useMarketsStream = () => {
  // get listing of all markets from /public/info
  const ws = useWebSocketClient();
  const { data } = useQuery<WSMessage.Ticker[]>(`/public/futures`);
  // const config = useSymbolsInfo();

  const value = useObservable<WSMessage.Ticker[] | null, WSMessage.Ticker[][]>(
    (_, input$) =>
      ws.observe<any>("tickers").pipe(
        startWith([]),
        withLatestFrom(input$.pipe(map((args) => args[0]))),
        map((args) => {
          if (args[0].length === 0) {
            return args[1];
          }

          return args[1].map((item) => {
            const ticker = args[0].find(
              (t: WSMessage.Ticker) => t.symbol === item.symbol
            );
            if (ticker) {
              // console.log(config[item.symbol]());
              return {
                ...item,
                ["24h_close"]: ticker.close,
                ["24h_open"]: ticker.open,
                ["24h_volumn"]: ticker.volume,
                change: 0,
              };
            }
            return item;
          });

          // return args[1];
        })
      ),
    null,
    [data as WSMessage.Ticker[]]
  );

  // return listing;
  return { data: value };
};
