# 正式網站部署說明

已部署至專用 repository：`jonchang046-ux/home-3d-planner`。
正式網址：https://jonchang046-ux.github.io/home-3d-planner/ 。2026-10-01 已確認 HTTP 200、私人登入入口及電腦／手機尺寸登入畫面；真實帳號與實體 iPhone 雙向同步尚待驗收。

## 私人格局部署版（2026-10-01）

使用 `outputs/home-3d-planner-private-release`，不要使用先前含格局的 `home-3d-planner-release` 或舊 ZIP。

正式版只公開通用介面、家具庫及渲染程式。部署版 `house-config.js` 僅有共用計算函式及登入後資料設定入口，沒有房間位置、尺寸、量測備註或預設家具座標。實際格局與預設配置存放在專用 Supabase 的 `planner_geometry`，由 `owner_id = auth.uid()` 限制讀取。

本機 `outputs/home-studio/house-config.js` 保留完整原始資料，方便之後校正；此檔案不能直接上傳到公開 repository。不能只在画面加登入遮罩，仍把真實格局留在公開 JavaScript。

## 原部署包的公開範圍（已停用）

GitHub Pages 靜態網站會提供 HTML、CSS、JavaScript 及 Three.js 檔案。`house-config.js` 包含實際住家的格局、尺寸及推算資料，網站訪客可以下載這些內容。公開 repository 還會公開網站原始碼。

部署包不包含帳號密碼、登入 token、使用者家具配置、物品照片、GLB、自訂模型、PDF、截圖、測試資料或資料庫管理密鑰。`cloud-config.js` 僅含瀏覽器用 publishable key；私人配置與資產由 Supabase 登入及所有權政策保護。

## 私人版部署步驟

1. 在專用 Supabase SQL Editor 執行本機 `work/private-geometry-install.sql` 一次：建立私人表並寫入既有帳號的格局。不改動家具／物品資料。此安裝檔含私人資料，禁止上傳 GitHub。再執行 `cloud/verify-geometry.sql` 驗證权限（測試資料全部回滾）。
2. 建立獨立的 `home-3d-planner` repository。只將 **private-release** 部署包解壓後的內容放在根目錄，保留 `vendor` 子目錄及 `.nojekyll`；禁止上傳整個本機專案。
3. Settings → Pages → Deploy from a branch → `main` / `(root)` → Save。等待 GitHub 顯示部署成功，確認實際 HTTPS 網址。
4. 專用 Supabase → Authentication → URL Configuration：Site URL 設為確認後的正式網址；Redirect URLs 加入相同網址（保留結尾 `/`）。僅操作 `fpzuumflfmzclphqoaij`。
5. 用正式網址登入既有帳號，取得私人格局後選擇雲端配置。沒有登入或沒有該帳號的格局資料時，不會啟動 App。不要把正式網址上的空白本機資料當作原始配置重新遷移。

## 驗收

- Windows 登入後確認物品庫圖片、模型；加入家具、修改位置／尺寸／旋轉／顏色，等顯示已同步，再重新整理。
- iPhone Safari 用相同正式網址、同一帳號登入，確認 Windows 的修改；在手機修改後回 Windows 更新。
- 測試 2D、3D、漫遊、手機工具面板及重新開啟。自動化手機尺寸測試不等於實體 Safari 驗收。
- 同一瀏覽器開第二個雲端編輯分頁應顯示鎖定提示；關閉原分頁後重新開啟。
- 救援 JSON 還原會新增副本、保留現有配置；不含二進位檔案，照片／模型必須仍在雲端。
- 雲端清理先預覽；只有超過 30 天且無引用的檔案符合條件，按永久清除前再次確認。

## 更新與回復

網站不需新增套件。以 `node work/prepare-home-release.mjs` 重新整理私人部署包（不是直接複製本機版），核對格局排除檢查後再上傳。保持相同網址及 Supabase 專案即可沿用雲端資料。回復程式只能使用私人部署包，不能回復到公開格局的舊包；不要刪除資料表或重跑 `001_initial.sql`。私人尺寸更新需另更新 `planner_geometry`，公開程式不附帶它。

若更換正式網域，先加入新 Auth 回跳網址再切換。不同網址的本機儲存各自獨立，私人雲端配置仍依相同帳號載入。

