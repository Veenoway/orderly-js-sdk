
import { FC, SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number;
}

export const ShareIcon: FC<IconProps> = (props) => {
    const { size = 60, viewBox, ...rest } = props;
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={`${size}px`}
            height={`${size}px`}

            viewBox={`0 0 ${size} ${size}`}
            {...rest}
        >
            <path d="M30 41.25C30 47.4632 24.9632 52.5 18.75 52.5C12.5368 52.5 7.5 47.4632 7.5 41.25C7.5 35.0368 12.5368 30 18.75 30C24.9632 30 30 35.0368 30 41.25Z" fill="#335FFC" />
            <path fill-rule="evenodd" clip-rule="evenodd" d="M18.75 40.5C19.9926 40.5 21 39.4926 21 38.25C21 37.0074 19.9926 36 18.75 36C17.5074 36 16.5 37.0074 16.5 38.25C16.5 39.4926 17.5074 40.5 18.75 40.5ZM18.75 42.75C21.2353 42.75 23.25 40.7353 23.25 38.25C23.25 35.7647 21.2353 33.75 18.75 33.75C16.2647 33.75 14.25 35.7647 14.25 38.25C14.25 40.7353 16.2647 42.75 18.75 42.75Z" fill="white" fill-opacity="0.98" />
            <path fill-rule="evenodd" clip-rule="evenodd" d="M10.5273 48.9276C10.8156 45.8824 13.3798 43.5 16.5004 43.5H21.0004C24.121 43.5 26.6852 45.8824 26.9734 48.9276C26.3158 49.6317 25.5687 50.2512 24.7504 50.7682V49.5C24.7504 47.4289 23.0715 45.75 21.0004 45.75H16.5004C14.4293 45.75 12.7504 47.4289 12.7504 49.5V50.7682C11.9321 50.2512 11.185 49.6317 10.5273 48.9276Z" fill="white" fill-opacity="0.98" />
            <path fill-rule="evenodd" clip-rule="evenodd" d="M20.25 15C20.25 17.8995 17.8995 20.25 15 20.25C12.1005 20.25 9.75 17.8995 9.75 15C9.75 12.1005 12.1005 9.75 15 9.75C17.8995 9.75 20.25 12.1005 20.25 15ZM22.5 15C22.5 16.7118 21.9265 18.2897 20.9612 19.552L23.8462 22.437C25.2508 21.2927 26.9803 20.5319 28.875 20.3142V19.3582C26.9341 18.8587 25.5 17.0968 25.5 15C25.5 12.5147 27.5147 10.5 30 10.5C32.4853 10.5 34.5 12.5147 34.5 15C34.5 17.0968 33.0659 18.8587 31.125 19.3582V20.3142C32.9744 20.5267 34.6664 21.2566 36.0525 22.3556L38.9605 19.4476C38.0425 18.2032 37.5 16.665 37.5 15C37.5 10.8579 40.8579 7.5 45 7.5C49.1421 7.5 52.5 10.8579 52.5 15C52.5 19.1421 49.1421 22.5 45 22.5C43.3346 22.5 41.7959 21.9572 40.5513 21.0388L37.6436 23.9465C38.743 25.3328 39.4733 27.0252 39.6858 28.875H40.6418C41.1413 26.9341 42.9032 25.5 45 25.5C47.4853 25.5 49.5 27.5147 49.5 30C49.5 32.4853 47.4853 34.5 45 34.5C42.9032 34.5 41.1413 33.0659 40.6418 31.125H39.6858C39.4681 33.0197 38.7073 34.7492 37.563 36.1538L40.448 39.0388C41.7103 38.0735 43.2882 37.5 45 37.5C49.1421 37.5 52.5 40.8579 52.5 45C52.5 49.1421 49.1421 52.5 45 52.5C40.8579 52.5 37.5 49.1421 37.5 45C37.5 43.3815 38.0127 41.8828 38.8845 40.6573L35.951 37.7238C34.8446 38.5775 33.5498 39.1988 32.1395 39.5145C32.0426 38.7597 31.8834 38.0245 31.6672 37.314C35.0069 36.5559 37.5 33.5691 37.5 30C37.5 25.8579 34.1421 22.5 30 22.5C26.4309 22.5 23.4441 24.9931 22.686 28.3328C21.9755 28.1166 21.2403 27.9574 20.4855 27.8605C20.8012 26.4502 21.4225 25.1554 22.2762 24.049L19.3427 21.1155C18.1172 21.9873 16.6185 22.5 15 22.5C10.8579 22.5 7.5 19.1421 7.5 15C7.5 10.8579 10.8579 7.5 15 7.5C19.1421 7.5 22.5 10.8579 22.5 15ZM32.25 15C32.25 16.2426 31.2426 17.25 30 17.25C28.7574 17.25 27.75 16.2426 27.75 15C27.75 13.7574 28.7574 12.75 30 12.75C31.2426 12.75 32.25 13.7574 32.25 15ZM45 32.25C46.2426 32.25 47.25 31.2426 47.25 30C47.25 28.7574 46.2426 27.75 45 27.75C43.7574 27.75 42.75 28.7574 42.75 30C42.75 31.2426 43.7574 32.25 45 32.25ZM45 20.25C47.8995 20.25 50.25 17.8995 50.25 15C50.25 12.1005 47.8995 9.75 45 9.75C42.1005 9.75 39.75 12.1005 39.75 15C39.75 17.8995 42.1005 20.25 45 20.25ZM50.25 45C50.25 47.8995 47.8995 50.25 45 50.25C42.1005 50.25 39.75 47.8995 39.75 45C39.75 42.1005 42.1005 39.75 45 39.75C47.8995 39.75 50.25 42.1005 50.25 45Z" fill="white" fill-opacity="0.36" />
        </svg>

    );
}
