"use client";

import React, { useMemo } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/utils/css";
import { SliderMark, SliderMarks } from "./marks";
import { SliderTip } from "./sliderTip";

// import { useSize } from "@radix-ui/react-use-size";

export type SliderColor = "primary" | "buy" | "sell";

interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  color: SliderColor;
  marks?: SliderMark[];
  markCount?: number;
  markLabelVisible?: boolean;
  showTip?: boolean;
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(
  (
    {
      className,
      marks,
      markCount,
      markLabelVisible,
      color = "primary",
      showTip = true,
      onValueChange,
      ...props
    },
    ref
  ) => {
    const { min = 0, max = 100, step } = props;

    // const spanRef = useRef<HTMLSpanElement | null>(null);

    // const size = useSize(spanRef.current);

    const innerMasks = useMemo(() => {
      if (Array.isArray(marks) && marks.length > 0) {
        return marks;
      }

      if (typeof markCount !== "undefined") {
        const marks: SliderMark[] = [];
        const piece = (max ?? 100) / markCount;
        const len = markCount - 1;

        for (let i = 0; i <= len; i++) {
          const value = Math.ceil(i * piece);
          marks.push({
            value,
            label: `${value}`,
          });
        }

        marks.push({
          value: max ?? 100,
          label: `100`,
        });

        return marks;
      }
    }, [marks, markCount, max]);

    const onValueChangeInner = (value: number[]) => {
      onValueChange?.(value);
    };

    const bgClassName = useMemo(() => {
      return cn(
        {
          "bg-primary border-primary": color === "primary",
          "bg-trade-profit border-trade-profit": color === "buy",
          "bg-trade-loss border-trade-loss": color === "sell",
        },
        props.disabled && "bg-fill-light"
      );
    }, [color]);

    return (
      <div className={cn("relative", !!markLabelVisible && "pb-[18px]")}>
        <SliderPrimitive.Root
          ref={ref}
          className={cn(
            "relative flex items-center select-none touch-none w-full h-[20px] ",
            className
          )}
          onValueChange={onValueChangeInner}
          {...props}
        >
          <SliderPrimitive.Track className="bg-fill-light relative grow rounded-full h-[2px] z-0">
            <SliderPrimitive.Range
              className={cn(
                "absolute bg-fill-light rounded-full h-full",
                bgClassName
              )}
            />
          </SliderPrimitive.Track>

          {Array.isArray(innerMasks) && innerMasks.length > 0 && (
            <SliderMarks
              value={props.value}
              color={color}
              marks={innerMasks}
              min={min}
              max={max}
            />
          )}
          <SliderPrimitive.Thumb
            className={cn(
              "block w-[10px] h-[10px] bg-fill border-[2px] border-fill-light rounded-[10px] focus:outline-none focus:w-[16px] focus:h-[16px] focus:shadow-[0_0_0_8px] focus:shadow-base-contrast/20 z-20 disabled:pointer-events-none group",
              {
                "border-primary": color === "primary",
                "border-trade-profit": color === "buy",
                "border-trade-loss": color === "sell",
              },
              props.disabled && "border-transparent bg-fill-light"
            )}
            aria-label="Volume"
          >
            {showTip && (
              <SliderTip
                value={props.value}
                className={bgClassName}
                max={max}
                min={0}
              />
            )}
          </SliderPrimitive.Thumb>
        </SliderPrimitive.Root>
      </div>
    );
  }
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
