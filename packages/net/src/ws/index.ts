import { type WebSocketSubject, webSocket } from "rxjs/webSocket";

import { WS_URL } from "./contants";
import { Observable, Observer, Subject, tap } from "rxjs";
import { messageHandlers } from "@/ws/handler/handler";

export type NetworkId = "testnet" | "mainnet";

export type WSOptions = {
  url?: string;
  networkId?: NetworkId;
  accountId?: string;

  onSigntureRequest: (accountId: string) => Promise<any>;
};

class WebSocket {
  // the topic reference count;
  private static __topicRefCountMap: Map<string, number> = new Map();
  private wsSubject: WebSocketSubject<any>;
  private privateWsSubject?: WebSocketSubject<any>;

  private authenticated: boolean = false;

  constructor(options: WSOptions) {
    this.wsSubject = this.createSubject(options);

    if (!!options.accountId) {
      this.privateWsSubject = this.createPrivateSubject(options);
    }

    this.bindSubscribe();
  }
  private createSubject(options: WSOptions): WebSocketSubject<any> {
    let url;
    if (typeof options.url === "string") {
      url = options.url;
    } else {
      url = WS_URL[options.networkId || "testnet"].public;
    }

    return webSocket({
      url: `${url}${options.accountId}`,
      openObserver: {
        next: () => {
          console.log("Connection ok");
        },
      },
      closeObserver: {
        next: () => {
          console.log("Connection closed");
        },
      },
    });
  }

  private createPrivateSubject(options: WSOptions): WebSocketSubject<any> {
    const url = WS_URL[options.networkId || "testnet"].private;
    const ws = webSocket({
      url: `${url}${options.accountId}`,
      openObserver: {
        next: () => {
          console.log("Private connection ok");
          if (this.authenticated || !options.accountId) return;

          options.onSigntureRequest?.(options.accountId).then((signature) => {
            this.authenticate(options.accountId!, signature);
          });
        },
      },
      closeObserver: {
        next: () => {
          console.log("Private connection closed");
          this.authenticated = false;
        },
      },
    });
    // authenticate

    return ws;
  }

  private bindSubscribe() {
    /// 处理ping,auth等消息
    const send = this.send.bind(this);
    this.wsSubject.subscribe({
      next: (message) => {
        const handler = messageHandlers.get(message.event);
        if (handler) {
          handler.handle(message, send);
        }
      },
      error(err) {
        console.log("WS Error: ", err);
      },
      complete() {
        console.log("WS Connection closed");
      },
    });

    if (!this.privateWsSubject) return;

    this.privateWsSubject.subscribe({
      next: (message) => {
        if (message.event === "auth") {
          this.authenticated = true;
          return;
        }
        const handler = messageHandlers.get(message.event);
        if (handler) {
          handler.handle(message, send);
        }
      },
      error(err) {
        console.log("WS Error: ", err);
      },
      complete() {
        console.log("WS Connection closed");
      },
    });
  }

  private authenticate(
    accountId: string,
    message: {
      publicKey: string;
      signature: string;
      timestamp: number;
    }
  ) {
    if (this.authenticated) return;
    if (!this.privateWsSubject) {
      console.error("private ws not connected");
      return;
    }

    console.log("push auth message:", message);
    this.privateWsSubject?.next({
      id: "auth",
      event: "auth",
      params: {
        orderly_key: message.publicKey,
        sign: message.signature,
        timestamp: message.timestamp,
      },
    });
    // this.wsSubject.next({ type: "authenticate" });
    // this.authenticated = true;
  }

  send(message: any) {
    this.wsSubject.next(message);
  }

  get isAuthed() {
    return this.authenticated;
  }

  // observe<T>(topic: string): Observable<T>;
  // observe<T>(topic: string, unsubscribe?: () => any): Observable<T>;
  // observe<T>(
  //   params: {
  //     event: string;
  //   } & Record<string, any>,
  //   unsubscribe?: () => any
  // ): Observable<T>;
  observe<T>(
    params: any,
    unsubscribe?: () => any,
    messageFilter?: (value: T) => boolean
  ): Observable<T> {
    return this._observe(false, params, unsubscribe, messageFilter);
  }

  // privateObserve<T>(topic: string): Observable<T>;
  // privateObserve<T>(topic: string, unsubscribe?: () => any): Observable<T>;
  // privateObserve<T>(
  //   params: {
  //     event: string;
  //   } & Record<string, any>,
  //   unsubscribe?: () => any
  // ): Observable<T>;
  privateObserve<T>(
    params: any,
    unsubscribe?: () => any,
    messageFilter?: (value: T) => boolean
  ): Observable<T> {
    return this._observe(true, params, unsubscribe, messageFilter);
  }

  private _observe<T>(
    isPrivate: boolean,
    params: any,
    unsubscribe?: () => any,
    messageFilter?: (value: T) => boolean
  ) {
    const [subscribeMessage, unsubscribeMessage, filter, messageFormatter] =
      this.generateMessage(params, unsubscribe, messageFilter);

    return new Observable((observer: Observer<T>) => {
      try {
        //TODO: add ref count, only send subscribe message when ref count is 0
        // 如果已经订阅过了，就不再发送订阅消息
        const refCount =
          WebSocket.__topicRefCountMap.get(subscribeMessage.topic) || 0;
        if (refCount === 0) {
          // WS.__topicRefCountMap.set(subscribeMessage.topic, WS.__topicRefCountMap.get(subscribeMessage.topic) + 1);
          this.send(subscribeMessage);
          WebSocket.__topicRefCountMap.set(
            subscribeMessage.topic,
            refCount + 1
          );
        }
      } catch (err) {
        observer.error(err);
      }

      const subscription = this.wsSubject.subscribe({
        next: (x) => {
          try {
            if (filter(x)) {
              observer.next(messageFormatter(x));
            }
          } catch (err) {
            observer.error(err);
          }
        },
        error: (err) => observer.error(err),
        complete: () => observer.complete(),
      });

      return () => {
        try {
          // console.log("******* unsubscribe", unsubscribeMessage);
          const refCount =
            WebSocket.__topicRefCountMap.get(subscribeMessage.topic) || 0;
          if (refCount > 1) {
            WebSocket.__topicRefCountMap.set(
              subscribeMessage.topic,
              refCount - 1
            );
            return;
          }
          if (!!unsubscribeMessage) {
            this.send(unsubscribeMessage);
          }
          WebSocket.__topicRefCountMap.delete(subscribeMessage.topic);
        } catch (err) {
          observer.error(err);
        }
        subscription.unsubscribe();
      };
    });
  }

  private generateMessage(
    params: any,
    unsubscribe?: () => any,
    messageFilter?: (value: any) => boolean
  ): [
    Record<string, any>,
    Record<string, any>,
    (message: any) => boolean,
    (message: any) => any
  ] {
    let subscribeMessage: Record<string, any>,
      unsubscribeMessage: Record<string, any>;
    let filter: (message: any) => boolean,
      messageFormatter: (message: any) => any = (message: any) => message.data;

    if (typeof params === "string") {
      subscribeMessage = { event: "subscribe", topic: params };
      unsubscribeMessage = { event: "unsubscribe", topic: params };
      filter = (message: any) => message.topic === params;
    } else {
      subscribeMessage = params;
      unsubscribeMessage =
        typeof unsubscribe === "function" ? unsubscribe() : unsubscribe;
      filter = messageFilter || ((message: any) => true);
    }

    return [subscribeMessage, unsubscribeMessage, filter, messageFormatter];
  }

  // 取消所有订阅
  desotry() {
    this.wsSubject.unsubscribe();
    this.privateWsSubject?.unsubscribe();
  }
}

export default WebSocket;
