@AGENTS.md

## 后台（同一个项目的另一半）

- 仓库：`../demo_system_online_single`（Laravel 9），工作分支 `zenwick`
- 改动前先在后台仓库确认当前分支是 `zenwick`，不是就停下来告诉用户
- 前台通过 `NEXT_PUBLIC_API_BASE_URL` 调后台，本地是 `http://demo_system_online_single.test/api`（Laravel Herd/Valet）
- 前台用到的接口在后台 `routes/api.php`（前缀 `/api`），主要逻辑在 `app/Http/Controllers/APIController.php`
- 返回格式：`{ "status": bool, "message": string, "data": ... }`，`status === false` 时用 `message` 提示
- 接口文档：后台 `API.md`

## 前后台一起改

- 新增或修改接口时，后台路由/Controller 和前台调用（`src/lib/*.ts`、`src/app/api/*`）一起改，不要只改一边
- 改了接口字段，同步更新后台 `API.md`
- 两个仓库分别 commit，提交信息互相对应
