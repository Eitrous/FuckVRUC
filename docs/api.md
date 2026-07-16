# API 接口

## 图书馆/藏书馆预约

### 查询余座

`https://zwlib.ruc.edu.cn/jsq/static/frontApi/res/findRoomDuration/<BuildingID>/<Date>`
- `<BuildingID>`:
  - 图书馆：`1875080631899230208`
  - 藏书馆：`1875080659246092288`
- `<Date>`: 形如 `1970-01-01`

#### Payload

```json
{
    "beginMinute":,
    "currentPage":,
    "endMinute":,
    "floorId":,
    "minMinute":,
    "pageSize":,
    "power":,
    "roomType":,
    "sortField":,
    "sortType":,
    "windows":
}
```
- `beginMinute`: 开始时间，单位为分钟
- `endMinute`: 结束时间，单位为分钟
- `floorId`: 楼层 id
  - 图书馆
    - `0` 全部楼层
    - `"1876808903766937600"` B1
    - `"1876448627456577536"` 一楼
    - `"1876448701611872256"` 二楼
    - `"1876808661059342336"` 三楼
    - `"1876808742844076032"` 四楼
    - `"1876808803686649856"` 五楼
  - 藏书馆
    - `0` 全部楼层
    - `"1876809036554407936"` 二楼
    - `"1876809088236621824"` 三楼
    - `"1876809139906252800"` 四楼
- `power`: 是否有电源
- `windows`: 是否靠窗

#### Response
示例：
```json
{
  "status" : true,
  "code" : 200,
  "message" : "操作成功",
  "data" : {
    "showPage" : [ 1, 2 ],
    "currentPage" : 1,
    "pageSize" : 12,
    "totalCount" : 17,
    "totalPage" : 2,
    "frontPage" : 0,
    "nextPage" : 2,
    "front" : false,
    "next" : true,
    "pageList" : [ {
      "id" : "1878649390807224320",
      "buildingId" : "1875080631899230208",
      "floorId" : "1876808903766937600",
      "name" : "B1自习区",
      "nameE" : "B1_self_study_area",
      "imgPath" : "",
      "remark" : "",
      "orderNo" : 1,
      "type" : "NORMAL",
      "enabled" : 1,
      "autoType" : 1,
      "preMake" : 0,
      "teamMake" : 0,
      "randMake" : 1,
      "layHv" : 0,
      "laySf" : 0,
      "seatTotal" : 180,
      "seatLock" : 2,
      "seatScene" : 178,
      "seatFree" : 150,
      "markMode" : 0,
      "buildingName" : "图书馆",
      "buildingNameE" : "图书馆",
      "floorName" : "B1",
      "floorNameE" : "B1",
      "maxMinute" : 900,
      "planDay" : 0,
      "planBegin" : "",
      "noEmptySeat" : true
    }, {
      "id" : "1877625107981111296",
      "buildingId" : "1875080631899230208",
      "floorId" : "1876448627456577536",
      "name" : "1F外文一区",
      "nameE" : "1F外文一区",
      "imgPath" : "",
      "remark" : "",
      "orderNo" : 2,
      "type" : "NORMAL",
      "enabled" : 1,
      "autoType" : 1,
      "preMake" : 0,
      "teamMake" : 0,
      "randMake" : 1,
      "layHv" : 0,
      "laySf" : 0,
      "seatTotal" : 76,
      "seatLock" : 0,
      "seatScene" : 0,
      "seatFree" : 63,
      "markMode" : 0,
      "buildingName" : "图书馆",
      "buildingNameE" : "图书馆",
      "floorName" : "一楼",
      "floorNameE" : "1F",
      "maxMinute" : 900,
      "planDay" : 0,
      "planBegin" : "",
      "noEmptySeat" : true
    }, 
    ...
    ]
  }
}
```

### 查询余座详情
`https://zwlib.ruc.edu.cn/jsq/static/frontApi/res/freeSeatIdsDuration/<RoomID>/<Date>`
- `RoomID`: 房间id，即查询余座得到的id

#### Payload
示例
```json
{
    "beginMinute":1177,
    "endMinute":0,
    "minMinute":0
}
```

#### Response
示例
```json
{
  "status" : true,
  "code" : 200,
  "message" : "操作成功",
  "data" : {
    "1878401493306019840" : {
      "id" : "1878401493306019840",
      "label" : "s107",
      "name" : "3行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019841" : {
      "id" : "1878401493306019841",
      "label" : "s091",
      "name" : "11行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019842" : {
      "id" : "1878401493306019842",
      "label" : "s096",
      "name" : "9行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019843" : {
      "id" : "1878401493306019843",
      "label" : "s103",
      "name" : "5行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    ...
  }
}
```

### 查询座位详情

#### 获取时间线
`https://zwlib.ruc.edu.cn/jsq/static/frontApi/res/getTimeLine/<SeatID>/<Date>`
- `SeatID`: 座位ID

##### Payload
```json
{}
```

##### Response
示例
```json
{
  "status" : true,
  "code" : 200,
  "message" : "操作成功",
  "data" : {
    "markList" : [ {
      "label" : "07:00",
      "left" : 0.0,
      "width" : ""
    }, {
      "label" : "12:00",
      "left" : 33.33,
      "width" : ""
    }, {
      "label" : "18:00",
      "left" : 73.33,
      "width" : ""
    }, {
      "label" : "22:00",
      "left" : 100.0,
      "width" : ""
    } ],
    "freeList" : [ {
      "label" : "20:50-22:00",
      "left" : 92.22,
      "width" : 7.78
    } ]
  }
}
```
- `data.markList`: 用于前端显示，无关紧要
- `freeList`: 空闲时段列表

#### 获取可选开始时间列表
`https://zwlib.ruc.edu.cn/jsq/static/frontApi/res/getStartTimes/<SeatID>/<Date>`

##### Payload
```json
{}
```

##### Response
示例
```json
{
  "status" : true,
  "code" : 200,
  "message" : "操作成功",
  "data" : [ [ "now", "现在" ], [ "1260", "21:00" ] ]
}
```
- `data`: 可选开始时间列表

#### 获取可选结束时间列表
进入预约界面以及选择了开始时间后都会调用一次
`https://zwlib.ruc.edu.cn/jsq/static/frontApi/res/getEndTimes/<SeatID>/<Date>/<Time>`
- `Time`: 当前时间，单位为分钟，例如 1250 -> 20:50

##### Payload
```json
{}
```

##### Response
示例
```json
{
  "status" : true,
  "code" : 200,
  "message" : "操作成功",
  "data" : [ [ "1260", "21:00" ], [ "1320", "22:00" ] ]
}
```

#### 提交预约
`https://zwlib.ruc.edu.cn/jsq/static/frontApi/make/freeBook/<SeatID>/<Date>/<StartTime>/<EndTime>?capToken=capToken`

##### Payload
```json
{}
```

##### Response
示例
```json
{
  "status" : true,
  "code" : 200,
  "message" : "操作成功",
  "data" : {
    "ctId" : "",
    "id" : ,
    "roomId" : ,
    "seatId" : ,
    "seatLabel" : ,
    "oneself" : false,
    "username" : "<学号>",
    "fullName" : "<姓名>",
    "receipt" : "<凭证>",
    "makeDate" : ,
    "makeBegin" : ,
    "makeEnd" : ,
    "actualBegin" : "",
    "actualEnd" : -1,
    "awayTime" : "",
    "resTime" : "",
    "useMinute" : 0,
    "kwhRate" : "",
    "status" : "RESERVE",
    "isSign" : 1,
    "remark" : "",
    "makeDateStr" : "<Date>",
    "makeBeginStr" : ,
    "makeEndStr" : ,
    "actualStr" : "",
    "awayRange" : "",
    "buildName" : ,
    "floorName" : ,
    "roomName" : ,
    "location" : ,
    "buildNameE" : ,
    "floorNameE" : ,
    "roomNameE" : ,
    "locationE" : ,
    "message" : "请在  至  之间完成签到",
    "linkId" : "0",
    "showCheckBtn" : false,
    "awayTimeM" : 0
  }
}
```

### 查询预约记录

#### 查询今日预约

`https://zwlib.ruc.edu.cn/jsq/static/frontApi/user/lastMake`

##### Payload
```json
{}
```

##### Response

```json
{
  "status" : true,
  "code" : 200,
  "message" : "操作成功",
  "data" : [ {
    "ctId" : "",
    "id" : ,
    "roomId" : ,
    "seatId" : ,
    "seatLabel" : ,
    "oneself" : true,
    "username" : ,
    "fullName" : ,
    "receipt" : ,
    "makeDate" : ,
    "makeBegin" : ,
    "makeEnd" : ,
    "actualBegin" : "",
    "actualEnd" : -1,
    "awayTime" : "",
    "resTime" : "",
    "useMinute" : 0,
    "kwhRate" : "",
    "status" : "RESERVE",
    "isSign" : 1,
    "remark" : "",
    "makeDateStr" : ,
    "makeBeginStr" : ,
    "makeEndStr" : ,
    "actualStr" : "",
    "awayRange" : "",
    "buildName" : ,
    "floorName" : ,
    "roomName" : ,
    "location" : ,
    "buildNameE" : ,
    "floorNameE" : ,
    "roomNameE" : ,
    "locationE" : ,
    "message" : "请在  至  之间完成签到",
    "linkId" : "0",
    "showCheckBtn" : false,
    "awayTimeM" : 0
  }, {
    "ctId" : "",
    "id" : ,
    "roomId" : ,
    "seatId" : ,
    "seatLabel" : ,
    "oneself" : true,
    "username" : ,
    "fullName" : ,
    "receipt" : ,
    "makeDate" : ,
    "makeBegin" : ,
    "makeEnd" : ,
    "actualBegin" : "",
    "actualEnd" : -1,
    "awayTime" : "",
    "resTime" : "",
    "useMinute" : 0,
    "kwhRate" : "",
    "status" : "CANCEL",
    "isSign" : 1,
    "remark" : "",
    "makeDateStr" : ,
    "makeBeginStr" : ,
    "makeEndStr" : ,
    "actualStr" : "",
    "awayRange" : "",
    "buildName" : ,
    "floorName" : ,
    "roomName" : ,
    "location" : ,
    "buildNameE" : ,
    "floorNameE" : ,
    "roomNameE" : ,
    "locationE" : ,
    "message" : "用户通过电脑端取消预约",
    "linkId" : "0",
    "showCheckBtn" : false,
    "awayTimeM" : 0
  } ]
}
```

#### 查询历史预约

`https://zwlib.ruc.edu.cn/jsq/static/frontApi/user/history/0/10`

##### Payload

```json
{}
```

##### Response
示例
```json
{
  "status" : true,
  "code" : 200,
  "message" : "操作成功",
  "data" : {
    "count" : 47,
    "list" : [ {
      "ctId" : "",
      "id" : ,
      "roomId" : ,
      "seatId" : ,
      "seatLabel" : ,
      "oneself" : true,
      "username" : ,
      "fullName" : ,
      "receipt" : ,
      "makeDate" : ,
      "makeBegin" : ,
      "makeEnd" : ,
      "actualBegin" : "",
      "actualEnd" : -1,
      "awayTime" : "",
      "resTime" : "",
      "useMinute" : 0,
      "kwhRate" : "",
      "status" : "CANCEL",
      "isSign" : 1,
      "remark" : "",
      "makeDateStr" : ,
      "makeBeginStr" : ,
      "makeEndStr" : ,
      "actualStr" : "",
      "awayRange" : "",
      "buildName" : ,
      "floorName" : ,
      "roomName" : ,
      "location" : ,
      "buildNameE" : ,
      "floorNameE" : ,
      "roomNameE" : ,
      "locationE" : ,
      "message" : "用户通过移动端取消预约",
      "linkId" : "0",
      "showCheckBtn" : false,
      "awayTimeM" : 0
    }, {
      "ctId" : "",
      "id" : ,
      "roomId" : ,
      "seatId" : ,
      "seatLabel" : ,
      "oneself" : true,
      "username" : ,
      "fullName" : ,
      "receipt" : ,
      "makeDate" : ,
      "makeBegin" : ,
      "makeEnd" : ,
      "actualBegin" : ,
      "actualEnd" : ,
      "awayTime" : ,
      "resTime" : ,
      "useMinute" : ,
      "kwhRate" : "",
      "status" : "STOP",
      "isSign" : 1,
      "remark" : "",
      "makeDateStr" : ,
      "makeBeginStr" : ,
      "makeEndStr" : ,
      "actualStr" : ,
      "awayRange" : ,
      "buildName" : ,
      "floorName" : ,
      "roomName" : ,
      "location" : ,
      "buildNameE" : ,
      "floorNameE" : ,
      "roomNameE" : ,
      "locationE" : ,
      "message" : ,
      "linkId" : "0",
      "showCheckBtn" : false,
      "awayTimeM" : 
    } ]
  }
}
```

#### 查询违约记录

`https://zwlib.ruc.edu.cn/jsq/static/frontApi/user/breach/0/10`

##### Payload

```json
{}
```

##### Response
示例
```json
{
  "status" : true,
  "code" : 200,
  "message" : "操作成功",
  "data" : {
    "count" : 1,
    "list" : [ {
      "ctId" : "",
      "id" : ,
      "roomId" : ,
      "seatId" : ,
      "seatLabel" : ,
      "oneself" : true,
      "username" : ,
      "fullName" : ,
      "receipt" : ,
      "makeDate" : ,
      "makeBegin" : ,
      "makeEnd" : ,
      "actualBegin" : ,
      "actualEnd" : ,
      "awayTime" : ,
      "resTime" : "",
      "useMinute" : ,
      "kwhRate" : "",
      "status" : "LEAVE_EARLY",
      "isSign" : 1,
      "remark" : "",
      "makeDateStr" : ,
      "makeBeginStr" : ,
      "makeEndStr" : ,
      "actualStr" : ,
      "awayRange" : ,
      "buildName" : ,
      "floorName" : ,
      "roomName" : ,
      "location" : ,
      "buildNameE" : ,
      "floorNameE" : ,
      "roomNameE" : ,
      "locationE" : ,
      "message" : ,
      "linkId" : "0",
      "showCheckBtn" : false,
      "awayTimeM" : 
    } ]
  }
}
```
