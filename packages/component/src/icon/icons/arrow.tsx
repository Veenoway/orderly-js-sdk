import React, { FC } from "react";
import { SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
  size: number;
}

export const ArrowIcon: FC<IconProps> = (props) => {
  const { size = 12, viewBox, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={`${size}px`}
      height={`${size}px`}
      fill="none"
      viewBox={`0 0 12 12`}
      {...rest}
    >
      <path
        fill="currentColor"
        d="M1.739 3.75a.24.24 0 0 0-.183.394l4.26 5.145a.238.238 0 0 0 .367 0l4.261-5.145a.24.24 0 0 0-.183-.394H1.739Z"
      />
    </svg>
  );
};
