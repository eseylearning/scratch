const path = require("path");
const webpack = require("webpack");
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

// Plugins
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const ScratchWebpackConfigBuilder = require("scratch-webpack-configuration");

// const STATIC_PATH = process.env.STATIC_PATH || '/static';

const baseConfig = new ScratchWebpackConfigBuilder({
    rootPath: path.resolve(__dirname),
    enableReact: true,
    shouldSplitChunks: true,
})
    .setTarget("browserslist")
    .merge({
        output: {
            publicPath: "/scratch/",
            assetModuleFilename: "static/assets/[name].[hash][ext][query]",
            library: {
                name: "GUI",
                type: "umd2",
            },
        },
        optimization: {
            minimize: true,
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        compress: {
                            drop_console: process.env.NODE_ENV === 'production',
                            drop_debugger: process.env.NODE_ENV === 'production'
                        }
                    }
                })
            ],
            splitChunks: {
                chunks: 'all',
                minSize: 20000,
                minChunks: 1,
                maxAsyncRequests: 30,
                maxInitialRequests: 30,
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'all',
                        priority: 10
                    },
                    common: {
                        minChunks: 2,
                        priority: -20,
                        reuseExistingChunk: true
                    }
                }
            }
        },
        performance: {
            hints: process.env.NODE_ENV === 'production' ? 'warning' : false,
            maxEntrypointSize: 512000,
            maxAssetSize: 512000
        },
        resolve: {
            fallback: {
                Buffer: require.resolve("buffer/"),
                stream: require.resolve("stream-browserify"),
            },
        },
    })
    .addModuleRule({
        test: /\.(svg|png|wav|mp3|gif|jpg)$/,
        resourceQuery: /^$/, // reject any query string
        type: "asset", // let webpack decide on the best type of asset
    })
    .addPlugin(
        new webpack.DefinePlugin({
            "process.env.DEBUG": Boolean(process.env.DEBUG),
            "process.env.GA_ID": `"${process.env.GA_ID || "UA-000000-01"}"`,
            "process.env.GTM_ENV_AUTH": `"${process.env.GTM_ENV_AUTH || ""}"`,
            "process.env.GTM_ID": process.env.GTM_ID
                ? `"${process.env.GTM_ID}"`
                : null,
        })
    )
    .addPlugin(
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: "node_modules/scratch-blocks/media",
                    to: "static/blocks-media/default",
                },
                {
                    from: "node_modules/scratch-blocks/media",
                    to: "static/blocks-media/high-contrast",
                },
                {
                    // overwrite some of the default block media with high-contrast versions
                    // this entry must come after copying scratch-blocks/media into the high-contrast directory
                    from: "src/lib/themes/high-contrast/blocks-media",
                    to: "static/blocks-media/high-contrast",
                    force: true,
                },
                {
                    context: "node_modules/scratch-vm/dist/web",
                    from: "extension-worker.{js,js.map}",
                    noErrorOnMissing: true,
                },
            ],
        })
    );

if (!process.env.CI) {
    baseConfig.addPlugin(new webpack.ProgressPlugin());
}

// Add compression plugin for production builds
if (process.env.NODE_ENV === 'production') {
    baseConfig.addPlugin(
        new CompressionPlugin({
            test: /\.(js|css|html|svg)$/,
            algorithm: 'gzip',
            threshold: 10240,
            minRatio: 0.8
        })
    );
}

// build the shipping library in `dist/`
const distConfig = baseConfig
    .clone()
    .merge({
        entry: {
            "scratch-gui": path.join(__dirname, "src/index.js"),
        },
        output: {
            publicPath: "/scratch/",
            path: path.resolve(__dirname, "dist"),
        },
    })
    .addPlugin(
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: "src/lib/libraries/*.json",
                    to: "libraries",
                    flatten: true,
                },
            ],
        })
    );

// build the examples and debugging tools in `build/`
const buildConfig = baseConfig
    .clone()
    .enableDevServer(process.env.PORT || 8601)
    .merge({
        entry: {
            gui: "./src/playground/index.jsx",
            blocksonly: "./src/playground/blocks-only.jsx",
            compatibilitytesting: "./src/playground/compatibility-testing.jsx",
            player: "./src/playground/player.jsx",
        },
        output: {
            publicPath: "/scratch/",
            path: path.resolve(__dirname, "dist"),
        },
    })
    .addPlugin(
        new HtmlWebpackPlugin({
            chunks: ["gui"],
            template: "src/playground/index.ejs",
            title: "Scratch 3.0 GUI",
        })
    )
    .addPlugin(
        new HtmlWebpackPlugin({
            chunks: ["blocksonly"],
            filename: "blocks-only.html",
            template: "src/playground/index.ejs",
            title: "Scratch 3.0 GUI: Blocks Only Example",
        })
    )
    .addPlugin(
        new HtmlWebpackPlugin({
            chunks: ["compatibilitytesting"],
            filename: "compatibility-testing.html",
            template: "src/playground/index.ejs",
            title: "Scratch 3.0 GUI: Compatibility Testing",
        })
    )
    .addPlugin(
        new HtmlWebpackPlugin({
            chunks: ["player"],
            filename: "player.html",
            template: "src/playground/index.ejs",
            title: "Scratch 3.0 GUI: Player Example",
        })
    )
    .addPlugin(
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: "static",
                    to: "static",
                },
                {
                    from: "extensions/**",
                    to: "static",
                    context: "src/examples",
                },
            ],
        })
    );

// Skip building `dist/` unless explicitly requested
// It roughly doubles build time and isn't needed for `scratch-gui` development
// If you need non-production `dist/` for local dev, such as for `scratch-www` work, you can run something like:
// `BUILD_MODE=dist npm run build`
const buildDist =
    process.env.NODE_ENV === "production" || process.env.BUILD_MODE === "dist";

module.exports = buildDist
    ? [buildConfig.get(), distConfig.get()]
    : buildConfig.get();
