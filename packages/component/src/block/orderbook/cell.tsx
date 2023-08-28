import { FC, useContext, useMemo } from "react";
import { CellBar } from "./cellBar";
import { queries } from "@storybook/testing-library";
import { OrderBookContext } from "@/block/orderbook/orderContext";
import { commify, Decimal } from "@orderly.network/utils";
import { QtyMode } from "./types";

export enum OrderBookCellType {
  BID = "bid",
  ASK = "ask",
}

export interface OrderBookCellProps {
  background: string;
  price: number;
  quantity: number;
  // size: number;
  count: number;
  accumulated: number;
  type: OrderBookCellType;
  mode: QtyMode;
}

export const OrderBookCell: FC<OrderBookCellProps> = (props) => {
  const width = (props.accumulated / props.count) * 100;
  const { cellHeight, onItemClick } = useContext(OrderBookContext);

  const qty = Number.isNaN(props.quantity)
    ? "-"
    : props.mode === "amount"
    ? new Decimal(props.quantity).mul(props.price).toNumber()
    : props.quantity;

  return (
    <div
      className="overflow-hidden relative cursor-pointer "
      style={{ height: `${cellHeight}px` }}
      onClick={() => {
        if (Number.isNaN(props.price) || Number.isNaN(props.quantity)) return;
        onItemClick?.([props.price, props.quantity]);
      }}
    >
      <div className="flex flex-row justify-between items-center z-10 relative px-1 text-[12px] h-full">
        <div
          className={
            props.type === OrderBookCellType.ASK
              ? "text-trade-loss"
              : "text-trade-profit"
          }
        >
          {Number.isNaN(props.price) ? "-" : commify(props.price)}
        </div>
        <div className={"text-base-contrast/70"}>{qty}</div>
      </div>
      {Number.isNaN(width) ? null : (
        <CellBar
          width={width}
          className={
            props.type === OrderBookCellType.ASK
              ? "bg-trade-loss/20"
              : "bg-trade-profit/20"
          }
        />
      )}
    </div>
  );
};
