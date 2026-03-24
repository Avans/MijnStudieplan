import type { NextConfig } from "next";
import path from "path";

const isPagesDeployment = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isPagesDeployment ? '/MijnStudieplan' : '',
  assetPrefix: isPagesDeployment ? '/MijnStudieplan/' : '',
  images: { unoptimized: true },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
