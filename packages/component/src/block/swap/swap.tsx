import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { Divider } from "@/divider";
import { SwapSymbols, SymbolInfo } from "./sections/symbols";

import { SwapTime } from "./sections/swapTime";
import { SwapDetails, SwapInfo } from "./sections/swapDetials";
import { SwapProcess } from "./sections/swapProcess";
import { useCrossSwap, useSwap } from "@orderly.network/hooks";
import { toast } from "@/toast";
import { SwapMode, SwapProcessStatusStatus } from "./sections/misc";
import { API } from "@orderly.network/types";
import { CrossSwap } from "./sections/crossSwap";
import { SingleSwap } from "./sections/singleSwap";

export interface SwapProps {
  src: SymbolInfo;
  dst: SymbolInfo;
  // swapInfo: SwapInfo;
  mode: SwapMode;
  transactionData: any;
  slippage: number;

  chain?: API.NetworkInfos;
  nativeToken?: API.TokenInfo;

  onComplete?: (isSuccss: boolean) => void;
  onCancel?: () => void;
  onFail?: () => void;
}

export const Swap: FC<SwapProps> = (props) => {
  const { mode } = props;

  if (mode === SwapMode.Cross) {
    return <CrossSwap {...props} />;
  }

  return <SingleSwap {...props} />;

  // console.log(props);

  // const [status, setStatus] = useState<SwapProcessStatusStatus>(
  //   props.mode === SwapMode.Cross
  //     ? SwapProcessStatusStatus.Bridging
  //     : SwapProcessStatusStatus.Depositing
  // );

  // const [view, setView] = useState<"processing" | "details">("details");
  // const [tx, setTx] = useState<any>();

  // const { swap: doCrossSwap, status: bridgeStatus, message } = useCrossSwap();
  // const { swap: doSingleSwap } = useSwap();

  // console.log("swap props", dst, src);

  // const swapInfo = useMemo(() => {
  //   let info: any = {
  //     price: transaction.price,
  //     slippage,
  //     time: chainInfo?.est_txn_mins,
  //     received: dst.amount,
  //   };

  //   if (mode === SwapMode.Cross) {
  //     info = {
  //       ...info,
  //       bridgeFee: transaction.fees_from.stargate,
  //       swapFee: transaction.fees_from.woofi,
  //       dstGasFee: transaction.dst_infos.gas_fee,
  //     };
  //   } else {
  //     info = {
  //       ...info,
  //       dstGasFee: "0",
  //       swapFee: transaction.fees_from,
  //       // tradingFee: transaction.fees_from,
  //     };
  //   }

  //   return info;
  // }, [transaction, chainInfo?.est_txn_mins, mode, dst]);

  // useEffect(() => {
  //   if (bridgeStatus === "DELIVERED") {
  //     setStatus(SwapProcessStatusStatus.Depositing);

  //     //TODO: 模拟3s 后状态变更, 发布时需要移除
  //     setTimeout(() => {
  //       setStatus(SwapProcessStatusStatus.Done);
  //     }, 5000);
  //   }

  //   if (bridgeStatus === "FAILED") {
  //     setStatus(SwapProcessStatusStatus.BridgeFialed);
  //   }
  // }, [bridgeStatus]);

  // const doSwap = useCallback(() => {
  //   setView("processing");

  //   if (!transaction) return Promise.reject("No transaction data");

  //   let promise;

  //   if (mode === SwapMode.Cross) {
  //     promise = doCrossSwap({
  //       address: "",
  //       crossChainRouteAddress: chainInfo!.woofi_dex_cross_chain_router,
  //       src: {
  //         fromToken: transaction.src_infos.from_token,
  //         fromAmount: BigInt(transaction.src_infos.from_amount),
  //         bridgeToken: transaction.src_infos.bridge_token,
  //         minBridgeAmount: BigInt(transaction.src_infos.min_bridge_amount),
  //       },
  //       dst: {
  //         chainId: transaction.dst_infos.chain_id,
  //         bridgedToken: transaction.dst_infos.bridged_token,
  //         toToken: transaction.dst_infos.to_token,
  //         minToAmount: BigInt(transaction.dst_infos.min_to_amount),
  //         orderlyNativeFees: 0n,
  //       },
  //     });
  //   } else {
  //     promise = doSingleSwap(
  //       chainInfo!.woofi_dex_depositor,
  //       {
  //         fromToken: transaction.infos.from_token,
  //         fromAmount: transaction.infos.from_amount,
  //         toToken: transaction.infos.to_token,
  //         minToAmount: transaction.infos.min_to_amount,
  //         orderlyNativeFees: 0n,
  //       },
  //       { dst, src }
  //     );
  //   }

  //   return promise.then(
  //     (res: any) => {
  //       console.log("*******", res);
  //       setTx(res);
  //       toast.success("Deposit requested");
  //     },
  //     (error: any) => {
  //       console.log("!!!!! swap error !!!!!", error);

  //       setStatus(SwapProcessStatusStatus.DepositFailed);

  //       toast.error(error.message || "Error");
  //     }
  //   );
  // }, [transaction, mode, dst, src]);

  // const content = useMemo(() => {
  //   if (view === "details") {
  //     return (
  //       <SwapDetails
  //         onConfirm={doSwap}
  //         info={swapInfo}
  //         src={props.src}
  //         dst={props.dst}
  //         mode={mode}
  //         markPrice={transaction.mark_prices?.from_token ?? 1}
  //         nativePrice={transaction.mark_prices.native_token}
  //         nativeToken={nativeToken}
  //       />
  //     );
  //   }

  //   return (
  //     <SwapProcess
  //       status={status}
  //       message={message}
  //       bridgeStatus={bridgeStatus}
  //       chainInfo={chainInfo}
  //       mode={mode}
  //       tx={tx}
  //       onComplete={props.onComplete}
  //     />
  //   );
  // }, [
  //   view,
  //   swapInfo,
  //   message,
  //   bridgeStatus,
  //   mode,
  //   chainInfo,
  //   tx,
  //   props.onComplete,
  // ]);

  // return (
  //   <div>
  //     <div className="py-[24px]">
  //       <SwapSymbols from={props.src} to={props.dst} swapInfo={swapInfo} />
  //       <SwapTime time={chainInfo?.est_txn_mins ?? 0} />
  //     </div>
  //     <Divider />

  //     {content}
  //     <div className="flex justify-center text-sm gap-2 mt-5">
  //       <span className="text-base-contrast/50">Need help?</span>
  //       <a href="" className="text-primary-light">
  //         View FAQs
  //       </a>
  //     </div>
  //   </div>
  // );
};
