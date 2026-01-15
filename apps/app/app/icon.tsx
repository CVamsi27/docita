import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: 'transparent',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background Shape - Soft Rounded Square with Gradient */}
          <rect width="32" height="32" rx="8" fill="#4338ca" />
          <rect width="32" height="32" rx="8" fill="url(#paint0_linear)" fillOpacity="0.8" />
          
          {/* Medical Cross + D Integration */}
           {/* Vertical bar of the cross/D */}
          <path 
            d="M9 7H13V25H9V7Z" 
            fill="white" 
          />
           {/* Curve of the D */}
          <path 
            d="M13 7H17C21.4183 7 25 10.5817 25 15V17C25 21.4183 21.4183 25 17 25H13V20H17C18.6569 20 20 18.6569 20 17V15C20 13.3431 18.6569 12 17 12H13V7Z" 
            fill="white" 
          />
          {/* Horizontal cross bar extension to the left (making it a cross) */}
          <path
            d="M6 13.5H13V18.5H6V13.5Z"
            fill="white"
          />

          <defs>
            <linearGradient
              id="paint0_linear"
              x1="0"
              y1="0"
              x2="32"
              y2="32"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#6366f1" />
              <stop offset="1" stopColor="#4338ca" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
