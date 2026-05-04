# 商家开通流程

MVP 阶段采用人工开通商家权限。一个摊位文档对应一个商家，允许多个微信 OpenID 共同管理。

## 开通步骤

1. 商家打开小程序，进入“我的”页面。
2. 点击“获取 OpenID”。
3. 点击“复制”，把 OpenID 发给管理员。
4. 管理员进入云开发数据库 `vendors` 集合。
5. 找到对应摊位文档。
6. 把 OpenID 添加到 `ownerOpenids` 数组。

示例：

```json
{
  "_id": "demo-yuanyuan",
  "name": "圆圆烤冷面",
  "ownerOpenids": [
    "openid-1",
    "openid-2"
  ]
}
```

保存后，商家重新进入“我的 -> 商家工作台”，即可管理该摊位。

## 新建商家文档

如果商家还没有摊位文档，可先创建一个最小文档：

```json
{
  "name": "新摊位",
  "category": "小吃",
  "description": "",
  "phone": "",
  "isActive": true,
  "isOpen": false,
  "businessHours": "",
  "locationText": "",
  "latitude": null,
  "longitude": null,
  "locationPhotoFileID": "",
  "announcement": "",
  "ownerOpenids": ["商家的 OpenID"],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## 注意事项

1. 不要把顾客 OpenID 误加到商家摊位。
2. 离职、转让或误加时，从 `ownerOpenids` 中移除对应 OpenID 即可。
3. 后续可以把这套人工流程升级为“商家申请 -> 管理员审核 -> 自动写入 vendors”的后台能力。
