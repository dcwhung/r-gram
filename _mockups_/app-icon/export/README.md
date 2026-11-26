# R Gram app icon（export）

由 `src/export.cjs` 生成，唔好人手改；設計稿：`_mockups_/app-icon/index.html`。接入 app 係 T-039。

| 資料夾 | 方案 | 用途 |
| --- | --- | --- |
| `c-white-disc/` | C | 留底，暫時唔用 |
| `d-black-disc/` | D | 全 app 嘅 icon：手機主畫面、PWA manifest、favicon、管理端頂條 |

每個資料夾都有下面嘅檔：

| 檔案 | 用途 | 精細度 | 形狀 |
| --- | --- | --- | --- |
| `icon.svg` | Master（向量，可以再出任何尺寸） | full | rounded |
| `icon-1024.png` | 商店圖、master | full | rounded |
| `icon-512.png` | PWA manifest、開 app 畫面 | full | rounded |
| `icon-192.png` | PWA manifest（Android 主畫面） | full | rounded |
| `icon-180.png` | iOS 主畫面（apple-touch-icon） | full | square |
| `icon-48.png` | favicon（高解像度分頁、書籤） | mid | rounded |
| `icon-32.png` | favicon（分頁） | small | rounded |
| `icon-16.png` | favicon（最細分頁） | tiny | rounded |
| `icon-maskable-512.png` | PWA manifest 嘅 maskable icon（Android） | full | maskable |
| `icon-maskable-192.png` | PWA manifest 嘅 maskable icon（Android） | full | maskable |

形狀：`rounded` = 透明圓角；`square` = 鋪滿正方形（iOS 自己切圓角）；`maskable` = 鋪滿，碟同唱臂縮入中間 80% 安全圓。
