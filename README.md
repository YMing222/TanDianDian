# 摊点点

「摊点点」是一个面向小吃摊贩和顾客的微信小程序 MVP。它帮助顾客快速找到附近正在出摊的小吃摊，查看摊位信息、菜单、位置照片并提前预约点单；也帮助摊主发布今日出摊状态、管理商品、处理预约订单。

第一版目标是跑通核心闭环：

1. 摊主发布出摊位置、照片、营业状态和商品。
2. 顾客查看附近摊位、菜单和位置照片。
3. 顾客预约点单并选择商品口味。
4. 顾客线上支付或按配置继续线下自取流程。
5. 摊主实时看到已支付订单，接单、拒单退款或完成订单。
6. 顾客到摊自取。

## 技术方案

- 前端：微信小程序原生页面
- 后端：微信云开发云函数
- 数据库：微信云开发数据库
- 文件存储：微信云存储
- 地图：微信定位、`wx.openLocation`
- 支付：微信支付 API v3 小程序/JSAPI 支付，支持自动退款
- 商家管理：内置在同一个小程序中
- 多商家：支持多商家结构，第一版通过管理员人工开通商家权限

当前小程序 AppID 与云环境配置见：

- `project.config.json`
- `miniprogram/app.js` 中的 `globalData.cloudEnv`

## 功能概览

### 顾客端

- 首页查看正在出摊的摊位
- 按距离展示摊位
- 查看摊位详情、营业状态、公告、位置、位置照片和商品
- 预约点单
- 商品口味选择，支持单选或多选
- 微信支付下单
- 查看我的订单
- 查看只读订单详情
- 未支付订单可重新支付
- 接单前可取消订单，已支付订单自动发起退款

### 商家端

- 商家身份与权限校验
- 商家工作台
- 商家资料保存
- 默认口味配置
- 出摊位置、时间、公告、位置照片保存
- 商品新增、编辑、上下架、售罄、删除
- 商品自定义口味配置
- 预约订单实时更新
- 接单、拒单并退款、完成订单

### 云函数

- `getOpenid`：获取当前微信用户 OpenID
- `vendorGetMine`：查询当前用户是否有商家权限
- `vendorSaveProfile`：保存商家资料和默认口味配置
- `vendorSaveStall`：保存出摊信息
- `productManage`：商品管理
- `orderCreate`：创建订单并发起微信支付预下单
- `orderPay`：重新发起订单支付
- `orderCancel`：顾客接单前取消订单，必要时自动退款
- `orderGetMine`：查询当前顾客订单列表
- `orderGetDetail`：查询当前顾客订单详情
- `orderUpdateStatus`：商家更新订单状态，拒单时自动退款
- `payNotify`：微信支付结果通知
- `refundNotify`：微信退款结果通知

## 目录结构

```text
.
├── miniprogram/             # 小程序前端页面
│   ├── app.js               # 小程序启动与云环境配置
│   ├── app.json             # 页面与 tabBar 配置
│   └── pages/
│       ├── customer/        # 顾客首页
│       ├── vendor/          # 顾客查看摊位详情
│       ├── order/           # 下单、订单列表、订单详情
│       ├── profile/         # 我的页面
│       └── merchant/        # 商家工作台、出摊、商品、订单、资料
├── cloudfunctions/          # 微信云开发云函数
├── docs/
│   ├── database.md          # 数据库集合与字段说明
│   ├── database-rules.md    # 数据库权限建议
│   ├── deploy.md            # 部署与发布检查清单
│   └── vendor-onboarding.md # 商家开通说明
├── project.config.json      # 微信开发者工具项目配置
└── README.md
```

## 数据库集合

项目使用以下云数据库集合：

- `users`
- `vendors`
- `vendor_locations`
- `vendor_pay_configs`
- `products`
- `orders`
- `announcements`

字段设计和初始化示例见 `docs/database.md`。

## 本地开发

1. 使用微信开发者工具导入项目根目录。
2. 确认 `project.config.json` 中的 `appid` 是当前小程序 AppID。
3. 确认 `miniprogram/app.js` 中的 `cloudEnv` 是当前云开发环境 ID。
4. 在云开发控制台创建数据库集合。
5. 按 `docs/database.md` 初始化至少一个 `vendors` 文档。
6. 按 `docs/vendor-onboarding.md` 为测试微信 OpenID 开通商家权限。
7. 逐个上传并部署 `cloudfunctions/` 下的云函数，选择“上传并部署：云端安装依赖”。

## 微信支付配置

线上支付采用“每摊独立商户号”方案。管理员需要在 `vendor_pay_configs` 集合中为每个摊位配置支付信息：

```json
{
  "vendorId": "vendors 集合中的摊位 _id",
  "mchId": "微信支付商户号",
  "appId": "当前小程序 AppID",
  "certSerialNo": "商户 API 证书序列号",
  "credentialKey": "YUANYUAN",
  "payNotifyUrl": "payNotify HTTP 触发地址",
  "refundNotifyUrl": "refundNotify HTTP 触发地址",
  "enabled": true
}
```

私钥和 API v3 密钥不写入数据库，需要配置到相关云函数环境变量中：

```text
WXPAY_YUANYUAN_PRIVATE_KEY=商户 API 私钥
WXPAY_YUANYUAN_API_V3_KEY=商户 API v3 密钥
WXPAY_PLATFORM_PUBLIC_KEY=微信支付平台证书公钥，可选但建议配置
```

需要配置环境变量的云函数：

- `orderCreate`
- `orderPay`
- `orderCancel`
- `orderUpdateStatus`
- `payNotify`
- `refundNotify`

详细部署步骤见 `docs/deploy.md`。

## 发布前检查

1. 所有云函数已部署到正确云环境。
2. 数据库集合和权限已按文档配置。
3. 至少有一个可测试摊位、商品和已开通权限的商家 OpenID。
4. 如启用线上支付，已配置 `vendor_pay_configs`、商户私钥、API v3 密钥和支付/退款回调 URL。
5. 真机测试顾客下单、支付、订单详情、商家实时订单、接单、拒单退款和完成订单。
6. 在微信开发者工具上传体验版。
7. 在微信公众平台配置体验成员，扫码测试。
8. 确认隐私说明覆盖手机号、定位、图片上传、订单和支付相关用途。

## 新环境接手提示

- 优先确认 `miniprogram/app.js` 的云环境 ID 是否需要改为新环境。
- 如果更换 AppID，需要同步更新 `project.config.json` 和微信支付商户号绑定关系。
- 新云环境需要重新创建集合、导入基础数据、部署云函数并配置环境变量。
- 支付回调地址与云环境相关，更换环境后需要重新填写 `vendor_pay_configs.payNotifyUrl` 和 `vendor_pay_configs.refundNotifyUrl`。
- `vendor_pay_configs` 中的密钥字段只是别名，真正密钥只放在云函数环境变量里。

## 参考文档

- `docs/database.md`
- `docs/database-rules.md`
- `docs/deploy.md`
- `docs/vendor-onboarding.md`
