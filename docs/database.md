# 摊点点数据库设计

MVP 使用微信云开发数据库。建议先创建以下集合：

```text
users
vendors
vendor_locations
products
orders
announcements
```

## vendors

摊位和商家资料。`ownerOpenids` 用于人工开通商家权限。

```json
{
  "_id": "demo-yuanyuan",
  "name": "圆圆烤冷面",
  "category": "烤冷面 / 炸串",
  "description": "现烤现做，支持提前预约自取。",
  "phone": "13800000000",
  "isActive": true,
  "isOpen": true,
  "businessHours": "18:00-23:00",
  "locationText": "东门地铁口 A 口旁",
  "latitude": 39.908823,
  "longitude": 116.39747,
  "locationPhotoFileID": "",
  "announcement": "今晚 18:00 出摊，限量供应。",
  "defaultFlavorOptions": ["不辣", "微辣", "中辣"],
  "defaultFlavorMultiSelect": false,
  "ownerOpenids": ["测试微信的 openid"],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## products

商家商品。

```json
{
  "vendorId": "demo-yuanyuan",
  "name": "烤冷面",
  "description": "可选酸甜、微辣、加蛋。",
  "price": 18,
  "isOnSale": true,
  "isSoldOut": false,
  "useVendorDefaultFlavor": true,
  "flavorOptions": [],
  "flavorMultiSelect": false,
  "sort": 1,
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## orders

顾客预约订单。

```json
{
  "vendorId": "demo-yuanyuan",
  "vendorName": "圆圆烤冷面",
  "openid": "user-openid",
  "items": [
    {
      "_id": "product-id",
      "name": "烤冷面",
      "price": 18,
      "quantity": 1,
      "selectedFlavors": ["微辣"],
      "flavorText": "微辣"
    }
  ],
  "pickupTime": "18:30",
  "contactPhone": "13800000000",
  "remark": "少辣",
  "totalAmount": 18,
  "status": "pending",
  "statusText": "待商家接单",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## 订单状态

```text
pending    待商家接单
accepted   商家已接单
rejected   商家已拒单
completed  已完成自取
canceled   已取消
```

## OpenID 获取

部署 `getOpenid` 云函数后，进入小程序“我的”页面，点击“获取 OpenID”，复制后填入对应摊位文档的 `ownerOpenids` 数组。
