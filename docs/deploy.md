# 部署与发布检查清单

## 1. 开发者工具准备

1. 用微信开发者工具导入项目根目录。
2. 确认 `project.config.json` 中的 AppID 是正式小程序 AppID。
3. 确认 `miniprogram/app.js` 中的 `cloudEnv` 是当前云开发环境 ID。
4. 在“云开发”面板确认环境已开通。

## 2. 创建数据库集合

在云开发数据库中创建：

```text
users
vendors
vendor_locations
vendor_pay_configs
products
orders
announcements
```

参考 `docs/database.md` 初始化至少一个 `vendors` 文档。

## 3. 上传并部署云函数

右键每个云函数目录，选择“上传并部署：云端安装依赖”：

```text
getOpenid
vendorGetMine
vendorSaveProfile
vendorSaveStall
productManage
orderCreate
orderGetMine
orderGetDetail
orderPay
orderCancel
orderUpdateStatus
payNotify
refundNotify
```

## 3.1 配置微信支付

每个摊位使用独立微信支付普通商户号。管理员在 `vendor_pay_configs` 中为摊位新增一条配置：

```json
{
  "vendorId": "摊位 ID",
  "mchId": "商户号",
  "appId": "小程序 AppID",
  "certSerialNo": "商户 API 证书序列号",
  "credentialKey": "唯一密钥标识，例如 YUANYUAN",
  "payNotifyUrl": "payNotify HTTP 触发地址",
  "refundNotifyUrl": "refundNotify HTTP 触发地址",
  "enabled": true
}
```

在相关支付云函数环境变量中配置：

```text
WXPAY_YUANYUAN_PRIVATE_KEY=商户 API 私钥
WXPAY_YUANYUAN_API_V3_KEY=商户 API v3 密钥
WXPAY_PLATFORM_PUBLIC_KEY=微信支付平台证书公钥，可选但建议配置
```

需要配置环境变量的云函数：`orderCreate`、`orderPay`、`orderCancel`、`orderUpdateStatus`、`payNotify`、`refundNotify`。

支付和退款通知 URL 使用 HTTP 云函数地址，不要带查询字符串。

## 4. 开通测试商家

1. 运行小程序，进入“我的”。
2. 点击“获取 OpenID”并复制。
3. 打开云数据库 `vendors` 集合。
4. 找到测试摊位文档，设置：

```json
{
  "ownerOpenids": ["复制到的 OpenID"]
}
```

5. 回到小程序“我的”，进入“商家工作台”。

## 5. 真机闭环测试

建议至少测试以下流程：

1. 摊主进入商家工作台。
2. 保存商家资料。
3. 设置今日出摊位置、时间、公告。
4. 上传摊位位置照片。
5. 新增商品并确认上架。
6. 顾客首页查看摊位。
7. 顾客进入详情页，查看照片、菜单、导航。
8. 顾客提交预约订单并完成微信支付。
9. 支付通知回调后，顾客在“我的订单”查看状态。
10. 顾客进入订单详情查看口味、数量、价格、支付和退款状态。
11. 摊主在“预约订单”实时看到已支付新订单，并接单、拒单退款、完成。

## 6. 上传体验版

1. 在微信开发者工具点击“上传”。
2. 填写版本号，例如 `0.1.0`。
3. 填写备注，例如 `MVP 体验版`。
4. 登录微信公众平台。
5. 进入“小程序后台 -> 版本管理”。
6. 将开发版本设为体验版。
7. 在“成员管理 -> 体验成员”添加测试微信。
8. 使用体验版二维码在手机微信扫码测试。

## 7. 提交审核前检查

1. 页面没有乱码、坏标签或明显占位文案。
2. 定位权限说明与实际用途一致。
3. 隐私说明包含手机号、定位、图片上传等用途。
4. 数据库权限规则已收紧，关键写操作走云函数。
5. 云函数全部部署到正确环境。
6. 至少有一个可供审核人员测试的摊位和商品。
7. 审核说明中写清楚顾客端和商家端测试路径。

## 8. 提交审核与发布

1. 在“小程序后台 -> 版本管理”点击“提交审核”。
2. 填写类目、测试账号或测试说明。
3. 审核通过后点击“发布”。
