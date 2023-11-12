import {
  FC,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  MouseEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { TabIndicator } from "./indicator";
import { Tab, TabTitle } from "./tab";
import { TabContext, TabContextState } from "./tabContext";
import { cn } from "@/utils/css";

export type TabItem = {
  title: ReactNode;
  value?: string;
  disabled?: boolean;
};

export type TabBarExtraRender = (tabContext: TabContextState) => ReactNode;

interface TabListProps {
  tabs: TabItem[];
  value?: string;
  //   activeIndex: number;
  onTabChange?: (value: string) => void;
  tabBarExtra?: ReactNode | TabBarExtraRender;
  className?: string;
  showIdentifier?: boolean;
}

type IndicatorBounding = {
  left: number;
  width: number;
};

export const TabList: FC<TabListProps> = (props) => {
  const [bounding, setBounding] = useState<IndicatorBounding>({
    left: 0,
    width: 40,
  });

  const boxRef = useRef<HTMLDivElement>(null);
  const tabContext = useContext(TabContext);

  const calcLeft = useCallback((target: HTMLButtonElement) => {
    if (!target) {
      return;
    }
    const { left, width } = target.getBoundingClientRect();

    const parentLeft = boxRef.current?.getBoundingClientRect().left || 0;

    //

    // setLeft(left - parentLeft + (width - 40) / 2);

    setBounding(() => ({
      // left: left - parentLeft + (width - 40) / 2,
      left: left - parentLeft,
      width,
    }));
  }, []);

  useEffect(() => {
    setTimeout(() => {
      let activeTab = boxRef.current?.querySelector(".active");

      if (!activeTab) {
        activeTab = boxRef.current?.childNodes[0] as HTMLButtonElement;
      }

      if (props.showIdentifier) {
        calcLeft(activeTab as HTMLButtonElement);
      }
    }, 50);
  }, [calcLeft, props.value, props.showIdentifier, props.tabs]);

  const onItemClick = useCallback(
    (value: any, event: MouseEvent<HTMLButtonElement>) => {
      if (typeof props.onTabChange === "undefined") return;

      calcLeft(event.currentTarget as HTMLButtonElement);
      props.onTabChange?.(value);

      if (!tabContext.contentVisible) {
        tabContext.toggleContentVisible();
      }
    },
    [props.onTabChange, tabContext.contentVisible]
  );

  const extraNode = useMemo(() => {
    if (typeof props.tabBarExtra === "undefined") return null;
    if (typeof props.tabBarExtra === "function") {
      return props.tabBarExtra(tabContext);
    }
    return props.tabBarExtra;
  }, [props.tabBarExtra, tabContext]);

  return (
    <div
      className={cn(
        "flex border-b border-b-divider px-3 items-center",
        props.className
      )}
    >
      <div className="pb-1 relative flex-1">
        <div className="flex space-x-5" ref={boxRef}>
          {props.tabs.map((item, index) => {
            return (
              <Tab
                key={index}
                title={item.title}
                value={item.value ?? index}
                disabled={item.disabled}
                active={
                  !!item.value &&
                  !!props.value &&
                  item.value === props.value &&
                  tabContext.contentVisible
                }
                onClick={onItemClick}
              />
            );
          })}
        </div>
        {props.showIdentifier && (
          <TabIndicator left={bounding.left} width={bounding.width} />
        )}
      </div>
      {extraNode}
    </div>
  );
};
