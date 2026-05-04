# 云数据库权限规则建议

MVP 阶段建议把“写操作”尽量收口到云函数，让云函数使用 `cloud.getWXContext()` 做身份校验。

在云开发控制台的数据库权限中，可以先按以下原则配置：

## vendors

顾客端需要读取公开摊位，商家资料、出摊状态等写操作由云函数完成。

```json
{
  "read": "doc.isActive == true || doc.ownerOpenids.has(auth.openid)",
  "write": false
}
```

## products

顾客端需要读取已上架商品，商家新增、编辑、删除商品由 `productManage` 云函数完成。

```json
{
  "read": "doc.isOnSale == true",
  "write": false
}
```

## orders

顾客订单读取建议走 `orderGetMine` 云函数，商家订单读取和状态更新也建议走云函数。数据库端先禁止直接读写，避免订单串读。

```json
{
  "read": false,
  "write": false
}
```

如果开发调试阶段确实需要前端临时直读订单，可使用更宽松的规则，但上线前应改回云函数读写。

## announcements

公告如果后续对顾客公开，可允许所有用户读取已发布公告，写入由云函数或后台管理完成。

```json
{
  "read": "doc.isPublished == true",
  "write": false
}
```

## users 和 vendor_locations

当前 MVP 暂未深度使用，建议默认关闭直接写入。

```json
{
  "read": false,
  "write": false
}
```

## 注意

1. 微信云开发数据库规则表达式能力会随控制台版本变化，配置时以控制台校验结果为准。
2. 如果某条规则控制台不支持数组方法，可临时选择“仅创建者可读写”或“所有用户可读，仅创建者可写”，同时保持关键写操作走云函数。
3. 上线前至少确认：顾客不能直接修改商品、订单、摊位资料；非摊主不能进入商家端或更新订单。
