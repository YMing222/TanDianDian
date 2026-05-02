# 摊点点

小吃摊贩预约点单微信小程序 MVP。

## 技术路线

- 微信小程序原生
- 微信云开发
- 第一版线下付款，不接微信支付
- 商家端内置在同一个小程序

## 已配置

- AppID：`wxb271660d78a6eaee`
- 项目名：`摊点点`
- 测试商家：`元元棒棒鸡`

## 启动

1. 用微信开发者工具导入当前目录。
2. 开通云开发环境。
3. 将 `miniprogram/app.js` 中的 `your-cloud-env-id` 替换为实际云环境 ID。
4. 在云开发数据库创建 `docs/database.md` 中列出的集合。
5. 部署 `cloudfunctions/orderCreate`、`cloudfunctions/orderUpdateStatus` 和 `cloudfunctions/vendorSaveStall`。

## MVP 页面

- 顾客：首页、摊位详情、预约点单、我的订单、我的
- 商家：工作台、出摊设置、商品管理、预约订单、商家资料
