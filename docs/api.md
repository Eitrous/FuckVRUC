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
    "1878401493306019844" : {
      "id" : "1878401493306019844",
      "label" : "s112",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019846" : {
      "id" : "1878401493306019846",
      "label" : "s108",
      "name" : "3行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019847" : {
      "id" : "1878401493306019847",
      "label" : "s104",
      "name" : "5行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019848" : {
      "id" : "1878401493306019848",
      "label" : "s111",
      "name" : "1行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019849" : {
      "id" : "1878401493306019849",
      "label" : "s099",
      "name" : "7行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019850" : {
      "id" : "1878401493306019850",
      "label" : "s092",
      "name" : "11行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019852" : {
      "id" : "1878401493306019852",
      "label" : "s095",
      "name" : "9行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019853" : {
      "id" : "1878401493306019853",
      "label" : "s100",
      "name" : "7行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019854" : {
      "id" : "1878401493306019854",
      "label" : "s090",
      "name" : "12行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878401493306019855" : {
      "id" : "1878401493306019855",
      "label" : "s097",
      "name" : "8行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019856" : {
      "id" : "1878401493306019856",
      "label" : "s106",
      "name" : "4行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019857" : {
      "id" : "1878401493306019857",
      "label" : "s105",
      "name" : "4行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019858" : {
      "id" : "1878401493306019858",
      "label" : "s101",
      "name" : "6行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019859" : {
      "id" : "1878401493306019859",
      "label" : "s110",
      "name" : "2行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019860" : {
      "id" : "1878401493306019860",
      "label" : "s109",
      "name" : "2行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019861" : {
      "id" : "1878401493306019861",
      "label" : "s093",
      "name" : "10行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019862" : {
      "id" : "1878401493306019862",
      "label" : "s098",
      "name" : "8行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878401493306019863" : {
      "id" : "1878401493306019863",
      "label" : "s094",
      "name" : "10行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878401493306019864" : {
      "id" : "1878401493306019864",
      "label" : "s089",
      "name" : "12行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019867" : {
      "id" : "1878401493306019867",
      "label" : "s102",
      "name" : "6行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019868" : {
      "id" : "1878401493306019868",
      "label" : "CD-S1",
      "name" : "3行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019869" : {
      "id" : "1878401493306019869",
      "label" : "CD-S3",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019870" : {
      "id" : "1878401493306019870",
      "label" : "CD-S2",
      "name" : "2行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019871" : {
      "id" : "1878401493306019871",
      "label" : "L-S7",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019872" : {
      "id" : "1878401493306019872",
      "label" : "L-S5",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019875" : {
      "id" : "1878401493306019875",
      "label" : "L-S4",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019876" : {
      "id" : "1878401493306019876",
      "label" : "L-S1",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019877" : {
      "id" : "1878401493306019877",
      "label" : "s005",
      "name" : "1行1列",
      "status" : "AWAY",
      "afterFree" : false
    },
    "1878401493306019878" : {
      "id" : "1878401493306019878",
      "label" : "L-S2",
      "name" : "2行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019881" : {
      "id" : "1878401493306019881",
      "label" : "s003",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019882" : {
      "id" : "1878401493306019882",
      "label" : "s002",
      "name" : "1行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878401493306019883" : {
      "id" : "1878401493306019883",
      "label" : "s001",
      "name" : "1行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878401493306019884" : {
      "id" : "1878401493306019884",
      "label" : "s006",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019886" : {
      "id" : "1878401493306019886",
      "label" : "s004",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019887" : {
      "id" : "1878401493306019887",
      "label" : "s023",
      "name" : "1行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878401493306019888" : {
      "id" : "1878401493306019888",
      "label" : "s024",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019889" : {
      "id" : "1878401493306019889",
      "label" : "s022",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019890" : {
      "id" : "1878401493306019890",
      "label" : "s021",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019891" : {
      "id" : "1878401493306019891",
      "label" : "s020",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019892" : {
      "id" : "1878401493306019892",
      "label" : "s019",
      "name" : "1行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878401493306019893" : {
      "id" : "1878401493306019893",
      "label" : "s017",
      "name" : "1行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878401493306019894" : {
      "id" : "1878401493306019894",
      "label" : "s015",
      "name" : "1行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878401493306019895" : {
      "id" : "1878401493306019895",
      "label" : "s014",
      "name" : "1行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878401493306019896" : {
      "id" : "1878401493306019896",
      "label" : "s013",
      "name" : "1行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878401493306019897" : {
      "id" : "1878401493306019897",
      "label" : "s018",
      "name" : "1行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878401493306019898" : {
      "id" : "1878401493306019898",
      "label" : "s016",
      "name" : "1行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878401493306019899" : {
      "id" : "1878401493306019899",
      "label" : "s011",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019900" : {
      "id" : "1878401493306019900",
      "label" : "s009",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019901" : {
      "id" : "1878401493306019901",
      "label" : "s008",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019902" : {
      "id" : "1878401493306019902",
      "label" : "s007",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878401493306019903" : {
      "id" : "1878401493306019903",
      "label" : "s012",
      "name" : "1行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878401493306019904" : {
      "id" : "1878401493306019904",
      "label" : "s010",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976448" : {
      "id" : "1878413518383976448",
      "label" : "s035",
      "name" : "3行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976449" : {
      "id" : "1878413518383976449",
      "label" : "s036",
      "name" : "4行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976450" : {
      "id" : "1878413518383976450",
      "label" : "s037",
      "name" : "5行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976451" : {
      "id" : "1878413518383976451",
      "label" : "s040",
      "name" : "14行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976452" : {
      "id" : "1878413518383976452",
      "label" : "s039",
      "name" : "14行2列",
      "status" : "AWAY",
      "afterFree" : false
    },
    "1878413518383976453" : {
      "id" : "1878413518383976453",
      "label" : "s038",
      "name" : "14行2列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976454" : {
      "id" : "1878413518383976454",
      "label" : "s034",
      "name" : "5行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976455" : {
      "id" : "1878413518383976455",
      "label" : "s033",
      "name" : "1行2列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976456" : {
      "id" : "1878413518383976456",
      "label" : "L-S3",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976457" : {
      "id" : "1878413518383976457",
      "label" : "s025",
      "name" : "1行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976458" : {
      "id" : "1878413518383976458",
      "label" : "s026",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976459" : {
      "id" : "1878413518383976459",
      "label" : "s027",
      "name" : "1行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976460" : {
      "id" : "1878413518383976460",
      "label" : "s028",
      "name" : "2行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976461" : {
      "id" : "1878413518383976461",
      "label" : "s029",
      "name" : "2行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976462" : {
      "id" : "1878413518383976462",
      "label" : "s030",
      "name" : "2行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976463" : {
      "id" : "1878413518383976463",
      "label" : "s031",
      "name" : "1行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976464" : {
      "id" : "1878413518383976464",
      "label" : "s032",
      "name" : "1行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976465" : {
      "id" : "1878413518383976465",
      "label" : "s057",
      "name" : "3行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976466" : {
      "id" : "1878413518383976466",
      "label" : "s058",
      "name" : "4行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976467" : {
      "id" : "1878413518383976467",
      "label" : "s059",
      "name" : "5行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976468" : {
      "id" : "1878413518383976468",
      "label" : "s062",
      "name" : "14行2列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976469" : {
      "id" : "1878413518383976469",
      "label" : "s061",
      "name" : "14行2列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976470" : {
      "id" : "1878413518383976470",
      "label" : "s060",
      "name" : "14行2列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976471" : {
      "id" : "1878413518383976471",
      "label" : "s056",
      "name" : "5行2列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976472" : {
      "id" : "1878413518383976472",
      "label" : "s055",
      "name" : "1行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976473" : {
      "id" : "1878413518383976473",
      "label" : "s047",
      "name" : "1行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976474" : {
      "id" : "1878413518383976474",
      "label" : "s048",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976475" : {
      "id" : "1878413518383976475",
      "label" : "s049",
      "name" : "1行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976476" : {
      "id" : "1878413518383976476",
      "label" : "s050",
      "name" : "2行2列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976477" : {
      "id" : "1878413518383976477",
      "label" : "s051",
      "name" : "2行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976478" : {
      "id" : "1878413518383976478",
      "label" : "s052",
      "name" : "2行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976479" : {
      "id" : "1878413518383976479",
      "label" : "s053",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976480" : {
      "id" : "1878413518383976480",
      "label" : "s054",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976481" : {
      "id" : "1878413518383976481",
      "label" : "s043",
      "name" : "3行2列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976482" : {
      "id" : "1878413518383976482",
      "label" : "s044",
      "name" : "3行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976483" : {
      "id" : "1878413518383976483",
      "label" : "s046",
      "name" : "4行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976484" : {
      "id" : "1878413518383976484",
      "label" : "s041",
      "name" : "4行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976485" : {
      "id" : "1878413518383976485",
      "label" : "s042",
      "name" : "2行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976486" : {
      "id" : "1878413518383976486",
      "label" : "s045",
      "name" : "4行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976487" : {
      "id" : "1878413518383976487",
      "label" : "s065",
      "name" : "3行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976488" : {
      "id" : "1878413518383976488",
      "label" : "s066",
      "name" : "3行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976489" : {
      "id" : "1878413518383976489",
      "label" : "s068",
      "name" : "4行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976490" : {
      "id" : "1878413518383976490",
      "label" : "s063",
      "name" : "4行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976491" : {
      "id" : "1878413518383976491",
      "label" : "s064",
      "name" : "2行2列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976492" : {
      "id" : "1878413518383976492",
      "label" : "s067",
      "name" : "4行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976493" : {
      "id" : "1878413518383976493",
      "label" : "s069",
      "name" : "2行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976494" : {
      "id" : "1878413518383976494",
      "label" : "s070",
      "name" : "2行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976495" : {
      "id" : "1878413518383976495",
      "label" : "s071",
      "name" : "2行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976496" : {
      "id" : "1878413518383976496",
      "label" : "s072",
      "name" : "1行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976497" : {
      "id" : "1878413518383976497",
      "label" : "s073",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976498" : {
      "id" : "1878413518383976498",
      "label" : "626",
      "name" : "2行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976499" : {
      "id" : "1878413518383976499",
      "label" : "s075",
      "name" : "2行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976500" : {
      "id" : "1878413518383976500",
      "label" : "s076",
      "name" : "2行2列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976501" : {
      "id" : "1878413518383976501",
      "label" : "s077",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976502" : {
      "id" : "1878413518383976502",
      "label" : "s078",
      "name" : "1行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976503" : {
      "id" : "1878413518383976503",
      "label" : "s080",
      "name" : "2行2列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976504" : {
      "id" : "1878413518383976504",
      "label" : "s081",
      "name" : "2行2列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976505" : {
      "id" : "1878413518383976505",
      "label" : "s082",
      "name" : "1行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976506" : {
      "id" : "1878413518383976506",
      "label" : "s083",
      "name" : "1行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976507" : {
      "id" : "1878413518383976507",
      "label" : "s079",
      "name" : "2行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976508" : {
      "id" : "1878413518383976508",
      "label" : "s085",
      "name" : "2行2列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976509" : {
      "id" : "1878413518383976509",
      "label" : "s086",
      "name" : "2行2列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976510" : {
      "id" : "1878413518383976510",
      "label" : "s087",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878413518383976511" : {
      "id" : "1878413518383976511",
      "label" : "s088",
      "name" : "1行1列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878413518383976512" : {
      "id" : "1878413518383976512",
      "label" : "s084",
      "name" : "2行1列",
      "status" : "FREE",
      "afterFree" : true
    },
    "1878683053817171968" : {
      "id" : "1878683053817171968",
      "label" : "s074",
      "name" : "2行2列",
      "status" : "IN_USE",
      "afterFree" : false
    },
    "1878685758748987392" : {
      "id" : "1878685758748987392",
      "label" : "L-S6",
      "name" : "1行1列",
      "status" : "FREE",
      "afterFree" : true
    }
  }
}
```