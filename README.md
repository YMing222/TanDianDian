# 摊点点

「摊点点」是一个面向小吃摊主和顾客的微信小程序 MVP。

第一版目标是跑通基础闭环：

1. 摊主发布今日出摊状态、位置、照片和商品。
2. 顾客查看附近正在出摊的摊位和菜单。
3. 顾客预约点单。
4. 摊主接单、拒单或标记完成。
5. 顾客到摊线下付款并自取。

## 技术方案

- 前端：微信小程序原生页面
- 后端：微信云开发云函数
- 数据库：微信云开发数据库
- 文件：微信云存储
- 支付：MVP 暂不接入，采用线下付款
- 地图：微信定位和 `wx.openLocation`

## 主要目录

```text
miniprogram/       小程序前端页面
cloudfunctions/    微信云函数
docs/              数据库和部署说明
```

## 当前云函数

- `getOpenid`：获取当前测试微信 OpenID
- `vendorGetMine`：查询当前用户是否有商家权限
- `vendorSaveProfile`：保存商家资料
- `vendorSaveStall`：保存出摊信息
- `productManage`：商家商品管理
- `orderCreate`：顾客创建预约订单
- `orderGetMine`：顾客查看自己的订单
- `orderUpdateStatus`：商家更新订单状态

## 开发提示

1. 使用微信开发者工具导入项目。
2. 确认 `miniprogram/app.js` 中的 `cloudEnv` 是当前云开发环境 ID。
3. 上传并部署全部云函数。
4. 按 `docs/database.md` 创建集合和初始化数据。
5. 按 `docs/vendor-onboarding.md` 为测试微信开通商家权限。
6. 按 `docs/database-rules.md` 收紧数据库权限。
7. 按 `docs/deploy.md` 做体验版和正式版发布前检查。
