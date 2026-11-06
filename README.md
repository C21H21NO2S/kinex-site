# KineX 宣传网站

静态网站，中英双语、亮暗双主题，首屏是滚动驱动的 WebGL 场景。构建产物是纯静态文件，部署在 GitHub Pages，不需要服务器。

线上地址：https://kinexnote.com/ （仓库 https://github.com/C21H21NO2S/kinex-site ；旧地址 c21h21no2s.github.io/kinex-site/ 会自动跳转）

## 本地开发

```bash
npm install
npm run dev        # http://127.0.0.1:5180
npm run build      # 输出到 dist/
npm run preview    # 预览 dist/，http://127.0.0.1:4180
```

URL 参数（调试用）：`?lang=zh|en`、`?theme=dark|light`、`?q=high|mid|low`（强制画质档位）。

## 发布

已配置好：仓库 Settings → Pages 的 Source 是 **GitHub Actions**。每次推到 `main` 分支，`.github/workflows/deploy.yml` 会自动构建并发布，一两分钟后生效（仓库的 Actions 页能看到进度）。

所有资源都用相对路径，放在子路径或自己的域名下都能用。

### 域名

`kinexnote.com` 在 Spaceship 注册，DNS 也在 Spaceship（高级 DNS）：

- `@` 的 4 条 A 记录：`185.199.108.153` / `109` / `110` / `111`，以及 4 条 AAAA：`2606:50c0:8000::153` / `8001` / `8002` / `8003`
- `www` 的 CNAME：`c21h21no2s.github.io`（`www` 会自动跳到根域名）
- TXT `_github-pages-challenge-C21H21NO2S`：GitHub 的域名所有权验证，**不要删**

GitHub 侧：账号 Settings → Pages 里 `kinexnote.com` 已验证；仓库 Settings → Pages 的 Custom domain 是 `kinexnote.com`，并开启 Enforce HTTPS。用 Actions 部署，所以仓库里不需要 `CNAME` 文件。换域名时，同时改 `index.html` 里的 `og:image`、`og:url` 和 `canonical`。

## 上线前要填的

- `src/config.js`：内测报名链接 `beta`、`github`、`privacy`。留空时按钮会提示“即将开放”，GitHub 和隐私链接会自动隐藏。

## 全局网盘下载

- 下载页的蓝奏云和百度网盘链接、密码统一放在 `download/index.html` 的网盘区域，所有版本共用。换包时更新网盘中的安装包即可。
- `public/download.js` 会对两个全局入口去重，版本下载卡片只补充其他独立备用地址。
- 百度网盘提取码随链接显示，网盘入口在版本列表读取失败时仍可使用。

## 宣传片

- 首页的“观看宣传片”按钮（首屏、页尾、页脚）打开弹窗播放器（`src/core/film.js`、`src/styles/film.css`）。弹窗第一次打开时才创建 `<video>`，之前不产生视频流量。
- 视频配置在 `src/config.js` 的 `PROMO`：按语言各一份，`en: null` 时英文页面也播中文版，并在视频下方提示英文版在制作中。
- 文件放两处，文件名一样：东京服务器 `https://media.kinexnote.com/promo/`（服务器上是 `/srv/kinex-media/promo/`，用 `scp` 上传；Caddy 站点写在 kinex-account 的 `scripts/server/setup.sh`）和本仓库的 `public/media/`（GitHub Pages 备用）。东京那份出错、或 10 秒内没加载出来，播放器自动换到备用，并从同一秒继续。
- 文件名带日期和内容哈希（例如 `kinex-promo-zh-20261102-390b6632.webm`），服务器给一年的长缓存；换新版时用新文件名，再改 `PROMO` 里的名字。
- 加英文版：把 webm、mp4、封面 webp（字幕没烧进画面的话再加 vtt）传到服务器同一目录并放进 `public/media/`，然后把 `PROMO.en` 填成和 `zh` 一样的结构（`subtitles` 填 `{ file, srclang: 'en', label: 'English' }` 或 `null`）。
- `index.html` 里的 `og:image` / `og:url` / `canonical`：都指向 https://kinexnote.com/ ，换域名时一起改。

## 改文案

- 所有可见文字都在 `src/i18n.js`（`zh` / `en` 两份）。
- 3D 场景里平板屏幕和纸片上的字在 `src/hero/textures.js`。
- 改完文案后运行 `npm run fonts`（需要 Python 和 `pip install fonttools brotli`）：它会按网站实际用到的字重新生成字体子集（`public/fonts/`）。不运行也能显示，新增的字会退回系统字体。

## 字体

自托管、按需子集（约 540 KB）：Inter、Instrument Serif、JetBrains Mono、Noto Sans SC、Noto Serif SC（SIL Open Font License），以及中文标题强调字用的霞鹜新致宋 LXGW Neo ZhiSong（只含标题 `<em>` 里的字，约 4 KB）。原始字体缓存在 `scripts/.font-src/`（不入库）。

霞鹜新致宋衍生自 IPA 字体，授权是 **IPA Font License 1.0**（不是 OFL）：子集字体算衍生程序，须随附许可证（已放在 `public/fonts/LXGW-Neo-ZhiSong-LICENSE.md`，随网站一起发布），字体名里不得出现「IPA」（子集保留原名 LXGW Neo ZhiSong，符合要求）。

## 结构

| 路径 | 内容 |
| --- | --- |
| `index.html` | 页面结构 |
| `src/main.js` | 启动顺序、加载动画、3D 叙事与滚动联动 |
| `src/hero/scene.js` | three.js 场景：平板、手写笔、纸片、连线 |
| `src/sections/` | 阅读（横向图版）、白板（可拖动、分屏）、笔迹（真实画板）、记忆（闪卡与遗忘曲线）、同步（线稿图） |
| `src/core/` | 主题/语言、平滑滚动、入场动画、画质分档、光标 |
| `public/posters/` | 不支持 WebGL 时的静态首屏 |

## 性能与降级

- 按设备分三档：`high`、`mid`（触屏设备，降低像素比）、`low`（弱 GPU 或内存 ≤3 GB：像素比 1、纸片减少、贴图缩小）。
- 渐进启动：页面和文字先出现，3D 场景在后台建好后淡入；关键字体在 `index.html` 里预加载。
- 不支持 WebGL 时显示静态海报；系统开启“减少动态效果”时关闭平滑滚动和装饰动画。
- three.js 按需异步加载；首屏脚本约 95 KB（gzip）。
