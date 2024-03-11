import { API } from "@orderly.network/types";
import { WSMessage } from "@orderly.network/types";
import { camelCaseToUnderscoreCase } from "@orderly.network/utils";
import { is, lensIndex, over, startsWith } from "ramda";

export const generateKeyFun =
  (args: { status?: string; symbol?: string; side?: string; size?: number }) =>
  (pageIndex: number, previousPageData: any): string | null => {
    // reached the end
    if (previousPageData && !previousPageData.rows?.length) return null;

    const { status, symbol, side, size = 100 } = args;

    const search = new URLSearchParams([
      ["size", size.toString()],
      ["page", `${pageIndex + 1}`],
      ["source_type", "ALL"],
    ]);

    if (status) {
      search.set(`status`, status);
    }

    if (symbol) {
      search.set(`symbol`, symbol);
    }

    if (side) {
      search.set(`side`, side);
    }

    return `/v1/orders?${search.toString()}`;
  };

export const updateOrdersHandler = (
  key: string,
  updatedOrder: WSMessage.AlgoOrder | WSMessage.Order,
  orders?: API.OrderResponse[]
) => {
  if (!orders) {
    return;
  }

  // console.log(key);
  const isAlgoOrder = "algoOrderId" in updatedOrder;

  const underscoreOrder = object2underscore(updatedOrder);

  let formattedOrder: API.Order & API.AlgoOrder = {
    ...underscoreOrder,
    updated_time: updatedOrder.timestamp,
    type: updatedOrder.type.replace("_ORDER", ""),
    //@ts-ignore
    // visible_quantity: updatedOrder.visibleQuantity || updatedOrder.visible,
  };

  if (typeof formattedOrder.visible_quantity === "undefined") {
    // check visible field;
    // @ts-ignore
    formattedOrder.visible_quantity = updatedOrder.visible;
  }

  // console.log(formattedOrder, updatedOrder);

  const hasCreateTime = "created_time" in formattedOrder;
  if (!hasCreateTime) {
    formattedOrder["created_time"] = updatedOrder.timestamp;
  }

  if (isAlgoOrder) {
    if (typeof updatedOrder.triggerTradePrice !== "undefined") {
      formattedOrder.trigger_price = updatedOrder.triggerTradePrice;
    }

    if (updatedOrder.type === "MARKET") {
      (formattedOrder as API.AlgoOrder).price = undefined;
    }
  } else {
    // formattedOrder.created_time = updatedOrder.timestamp;
  }

  // const index = lensIndex(0);
  const orderId =
    (updatedOrder as WSMessage.Order).orderId ||
    (updatedOrder as WSMessage.AlgoOrder).algoOrderId;

  const isExisting = orderIsExisting(orders, orderId);

  const status =
    (updatedOrder as WSMessage.Order).status ||
    (updatedOrder as WSMessage.AlgoOrder).rootAlgoStatus;

  switch (status) {
    case "NEW": {
      // chceck if the order is already in the list
      if (
        isExisting ||
        key.startsWith("orders:CANCELLED") ||
        key.startsWith("orders:FILLED") ||
        key.startsWith("orders:REJECTED")
      ) {
        return orders;
      }
      return insertOrders(orders, formattedOrder);
    }

    case "CANCELLED": {
      if (
        key.startsWith("orders:FILLED") ||
        key.startsWith("orders:REJECTED")
      ) {
        return orders;
      }
      if (key.startsWith("orders:NEW") || key.startsWith("orders:INCOMPLETE")) {
        return removeOrderIfExisting(orders, orderId);
      }

      if (key.startsWith("orders:CANCELLED")) {
        return insertOrders(orders, formattedOrder);
      }

      return updateOrders(orders, formattedOrder);
    }

    case "REPLACED":
      return updateOrders(orders, formattedOrder);

    case "FILLED": {
      if (isExisting) {
        // for new list, remove the order if it exists
        if (
          key.startsWith("orders:INCOMPLETE") ||
          key.startsWith("orders:NEW")
        ) {
          // if fullfilled, remove from the list
          if (updatedOrder.totalExecutedQuantity === updatedOrder.quantity) {
            return removeOrderIfExisting(orders, orderId);
          }

          // update
          return updateOrders(orders, formattedOrder);
        }
      } else {
        // for filled list, insert the order if it doesn't exist

        if (
          key.startsWith("orders:CANCELLED") ||
          key.startsWith("orders:INCOMPLETE") ||
          key.startsWith("orders:NEW")
        ) {
          return orders;
        }
        // if filled/history list:
        return insertOrders(orders, formattedOrder);
      }
    }

    default:
      return orders;
  }
};

function updateOrders(
  orders: API.OrderResponse[],
  formattedOrder: API.Order & API.AlgoOrder
) {
  return orders.map((item) => {
    return {
      // ...item,
      meta: item.meta,
      rows: item.rows.map((order: API.Order | API.AlgoOrder) => {
        const isAlgoOrder = "algo_order_id" in order;

        if (
          isAlgoOrder &&
          formattedOrder?.algo_order_id === order?.algo_order_id
        ) {
          return { ...order, ...formattedOrder };
        }

        if (!isAlgoOrder && formattedOrder?.order_id === order?.order_id) {
          return { ...order, ...formattedOrder };
        }

        return order;
      }),
    };
  });
}

function insertOrders(
  orders: API.OrderResponse[],
  formattedOrder: API.Order & API.AlgoOrder
) {
  const index = lensIndex(0);
  return over(
    index,
    (item: any) => ({
      meta: {
        ...item.meta,
        total: item.meta.total + 1,
      },
      rows: [formattedOrder, ...item.rows],
    }),
    orders
  );
}

function removeOrderIfExisting(
  orders: API.OrderResponse[],
  orderId: number
): API.OrderResponse[] {
  const isExisting = orderIsExisting(orders, orderId);
  if (!isExisting) return orders;
  return orders.map((item) => {
    return {
      meta: { ...item.meta, total: item.meta.total - 1 },
      rows: item.rows.filter((order: API.Order | API.AlgoOrder) => {
        const isAlgoOrder = "algo_order_id" in order;
        return isAlgoOrder
          ? (order as API.AlgoOrder).algo_order_id !== orderId
          : (order as API.Order).order_id !== orderId;
      }),
    };
  });
}

function findOrderIndex(
  orders: API.OrderResponse[],
  orderId: number
): number[] | undefined {
  let index: number = 0;
  let index2: number | undefined;

  for (let idx = 0; idx < orders.length; idx++) {
    index = idx;
    const item = orders[idx];

    for (let idx2 = 0; idx2 < item.rows.length; idx2++) {
      const element = item.rows[idx2];
      if (
        (element as API.AlgoOrder).algo_order_id === orderId ||
        (element as API.Order).order_id === orderId
      ) {
        index2 = idx2;

        break;
      }
    }
  }

  if (typeof index2 === "undefined") {
    return;
  }

  return [index, index2];
}

function orderIsExisting(orders: API.OrderResponse[], orderId: number) {
  const index = findOrderIndex(orders, orderId);
  return Array.isArray(index);
}

function object2underscore(obj: any) {
  return Object.keys(obj).reduce((acc, key) => {
    acc[camelCaseToUnderscoreCase(key)] = obj[key];
    return acc;
  }, {} as any);
}
