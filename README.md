# KineX 宣传网站

静态网站，中英双语、亮暗双主题，首屏是滚动驱动的 WebGL 场景。构建产物是纯静态文件，直接部署到 GitHub Pages，不需要服务器。

## 本地开发

Windows 上直接双击 `启动KineX宣传网站.bat`：第一次会自动安装依赖，服务就绪后自动打开浏览器（http://localhost:5180）；关掉黑色窗口就停止服务。已经在运行时再双击，只会打开浏览器。

```bash
npm install
npm run dev        # http://127.0.0.1:5180
npm run build      # 输出到 dist/
npm run preview    # 预览 dist/，http://127.0.0.1:4180
```

URL 参数（调试用）：`?lang=zh|en`、`?theme=dark|light`、`?q=high|mid|low`（强制画质档位）。

## 发布到 GitHub Pages

1. 在 GitHub 新建一个仓库，把本目录（`kinex-site/`）的内容推上去（`proposals/`、`node_modules/`、`dist/` 已在 `.gitignore` 里）。
2. 仓库 Settings → Pages → Build and deployment → Source 选 **GitHub Actions**。
3. 推到 `main` 分支后，`.github/workflows/deploy.yml` 会自动构建并发布，网址是 `https://<用户名>.github.io/<仓库名>/`。

所有资源都用相对路径，放在子路径下也能用。

## 上线前要填的

- `src/config.js`：内测报名链接 `beta`、短片链接 `film`、`github`、`privacy`。留空时按钮会提示“即将开放”，GitHub 和隐私链接会自动隐藏。
- `index.html` 里的 `og:image`：社交平台要求绝对地址，网址确定后改成 `https://<用户名>.github.io/<仓库名>/og.jpg`。

## 改文案

- 所有可见文字都在 `src/i18n.js`（`zh` / `en` 两份）。
- 3D 场景里平板屏幕和纸片上的字在 `src/hero/textures.js`。
- 改完文案后运行 `npm run fonts`（需要 Python 和 `pip install fonttools brotli`）：它会按网站实际用到的字重新生成字体子集（`public/fonts/`）。不运行也能显示，新增的字会退回系统字体。

## 字体

自托管、按需子集（约 540 KB）：Inter、Instrument Serif、JetBrains Mono、Noto Sans SC、Noto Serif SC，均为 SIL Open Font License。原始字体缓存在 `scripts/.font-src/`（不入库）。

## 结构

| 路径 | 内容 |
| --- | --- |
| `index.html` | 页面结构 |
| `src/main.js` | 启动顺序、加载动画、3D 叙事与滚动联动 |
| `src/hero/scene.js` | three.js 场景：平板、手写笔、纸片、连线、后期 |
| `src/sections/` | 阅读（横向图版）、白板（可拖动、分屏）、笔迹（真实画板）、记忆（闪卡与遗忘曲线）、同步（线稿图） |
| `src/core/` | 主题/语言、平滑滚动、入场动画、画质分档、光标 |
| `public/posters/` | 不支持 WebGL 时的静态首屏 |

## 性能与降级

- 按设备分三档：`high`（景深 + 辉光）、`mid`（触屏设备，降低像素比）、`low`（弱 GPU 或内存 ≤3 GB：关闭景深和辉光，纸片减半）。
- 不支持 WebGL 时显示静态海报；系统开启“减少动态效果”时关闭平滑滚动和装饰动画。
- three.js 按需异步加载；首屏脚本约 80 KB（gzip）。
