/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/db", "@workspace/types"],
}

export default nextConfig
