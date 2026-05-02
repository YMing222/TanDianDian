# 摊点点 MVP 数据库集合

第一版使用微信云开发数据库，建议先创建这些集合：

```text
users
vendors
vendor_locations
products
orders
announcements
```

## vendors

```json
{
  "_id": "demo-yuanyuan",
  "name": "元元棒棒鸡",
  "category": "凉菜 / 棒棒鸡",
  "description": "主打棒棒鸡、凉面，支持提前预约自取。",
  "phone": "",
  "isActive": true,
  "isOpen": true,
  "businessHours": "18:00-23:00",
  "locationText": "夜市入口左侧，黄色餐车",
  "latitude": 39.908823,
  "longitude": 116.39747,
  "locationPhotoFileID": "cloud://xxx/vendors/demo-yuanyuan/stall-location.jpg",
  "announcement": "今天 18:00 出摊，招牌棒棒鸡限量供应。",
  "ownerOpenids": []
}
```

## products

```json
{
  "vendorId": "demo-yuanyuan",
  "name": "招牌棒棒鸡",
  "description": "微辣，可备注少辣",
  "price": 18,
  "isOnSale": true,
  "isSoldOut": false,
  "sort": 1
}
```

## orders

```json
{
  "vendorId": "demo-yuanyuan",
  "openid": "user-openid",
  "items": [
    {
      "_id": "product-id",
      "name": "招牌棒棒鸡",
      "price": 18,
      "quantity": 1
    }
  ],
  "pickupTime": "18:30",
  "contactPhone": "13800000000",
  "remark": "少辣",
  "totalAmount": 18,
  "status": "pending",
  "statusText": "待商家确认",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

订单状态：

```text
pending    待商家确认
accepted   已接单
rejected   已拒单
completed  已完成
canceled   已取消
```
