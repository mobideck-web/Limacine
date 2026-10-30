import type {NextConfig} from 'next';

const commonHeaders = [
  {key: 'X-Content-Type-Options', value: 'nosniff'},
  {key: 'Referrer-Policy', value: 'no-referrer'},
  {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()'},
];
const contentSecurityPolicy = "base-uri 'self'; object-src 'none'; form-action 'self'; connect-src 'self'; img-src 'self' data: https://upload.wikimedia.org; frame-src https:";
const config: NextConfig = {
  async headers() {
    return [
      {source: '/:path*', headers: commonHeaders},
      {source: '/', headers: [{key: 'Content-Security-Policy', value: contentSecurityPolicy}]},
    ];
  },
};
export default config;
